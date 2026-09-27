import { supabase } from '../config/supabase.js';
import { CandidateProfile, RawJob, ScoredJob } from '../types.js';

/**
 * 1. Create or get existing user by username
 */
export async function getOrCreateUserByUsername(username: string) {
  const cleanUsername = username.trim().toLowerCase();

  // Try fetching existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('username', cleanUsername)
    .single();

  if (existingUser) return existingUser;

  // Insert new user if not found
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ username: cleanUsername })
    .select()
    .single();

  if (insertError) {
    console.error('[DB Error] Failed to create user:', insertError.message);
    throw insertError;
  }

  return newUser;
}

/**
 * 2. Save or update candidate profile
 */
export async function upsertCandidateProfile(userId: string, profile: CandidateProfile) {
  const payload = {
    id: userId,
    full_name: profile.name,
    phone: profile.phone,
    skills: profile.skills || [],
    locations: profile.locations || [],
    work_preference: profile.workPreference || 'any',
    disabilities: profile.disabilities || [], // Encrypt at app layer if sensitive
    accessibility_needs: profile.accessibilityNeeds || [],
    github: profile.github,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
    bio: profile.bio,
    resume_text: profile.resumeText,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('candidate_profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('[DB Error] Failed to upsert profile:', error.message);
    throw error;
  }

  return data;
}

/**
 * 3. Save aggregated jobs into database (Deduplicated by URL)
 */
export async function saveJobsToDatabase(jobs: RawJob[]): Promise<{ id: string; url: string }[]> {
  if (!jobs || jobs.length === 0) return [];

  const jobPayloads = jobs.map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location || 'Remote',
    is_remote: job.remote !== undefined ? job.remote : true,
    url: job.url,
    description: job.description,
    tags: job.tags || [],
    category: job.category || 'professional',
    physical_requirements: job.physicalRequirements || [],
    source: job.source,
    published_at: job.publishedAt ? new Date(job.publishedAt).toISOString() : new Date().toISOString(),
  }));

  // Upsert jobs on URL conflict and return ID + URL
  const { data, error } = await supabase
    .from('jobs')
    .upsert(jobPayloads, { onConflict: 'url' })
    .select('id, url');

  if (error) {
    console.warn('[DB Warning] Upsert returning error, falling back to query by URL:', error.message);
    const urls = jobs.map((j) => j.url);
    const { data: existingJobs } = await supabase
      .from('jobs')
      .select('id, url')
      .in('url', urls);
    return existingJobs || [];
  }

  return data || [];
}

/**
 * 4. Sync Candidate Profile, Raw Jobs, and Scored Matches into Supabase
 */
export async function syncScoredMatchesToDatabase(
  usernameOrUserId: string,
  profile: CandidateProfile,
  scoredJobs: ScoredJob[],
  rawJobs: RawJob[]
) {
  try {
    // A. Fetch/Create User
    const user = await getOrCreateUserByUsername(usernameOrUserId);

    // B. Save Candidate Profile
    await upsertCandidateProfile(user.id, profile);

    // C. Save Raw Jobs & obtain DB IDs
    const savedJobs = await saveJobsToDatabase(rawJobs);

    // D. Map job URLs to Supabase job IDs
    const urlToIdMap = new Map<string, string>();
    savedJobs.forEach((j) => {
      if (j.url && j.id) urlToIdMap.set(j.url, j.id);
    });

    // E. Prepare match records for scored jobs
    const matchPayloads = scoredJobs
      .filter((job) => urlToIdMap.has(job.url))
      .map((job) => ({
        user_id: user.id,
        job_id: urlToIdMap.get(job.url)!,
        match_score: parseFloat((job.score * 100).toFixed(2)),
        accessibility_score: parseFloat(((job.accessibilityScore !== undefined ? job.accessibilityScore : job.score) * 100).toFixed(2)),
        accessibility_status: job.accessibilityStatus || 'fully_accessible',
        match_reasons: job.matchReasons || [],
        updated_at: new Date().toISOString(),
      }));

    if (matchPayloads.length > 0) {
      const { error: matchError } = await supabase
        .from('job_matches')
        .upsert(matchPayloads, { onConflict: 'user_id,job_id' });

      if (matchError) {
        console.error('[DB Error] Failed to store job matches:', matchError.message);
      } else {
        console.log(`✅ [Supabase Sync] Successfully stored ${matchPayloads.length} matches in job_matches table for user '${usernameOrUserId}'`);
      }
    }
  } catch (err: any) {
    console.error('[DB Exception] syncScoredMatchesToDatabase failed:', err.message);
  }
}

/**
 * 5. Save job evaluation match & AI cover letter draft
 */
export async function saveJobMatchResult(
  userId: string,
  jobId: string,
  match: {
    score: number;
    accessibilityScore: number;
    accessibilityStatus: string;
    reasons: string[];
    coverLetterDraft?: string;
  }
) {
  const payload = {
    user_id: userId,
    job_id: jobId,
    match_score: match.score,
    accessibility_score: match.accessibilityScore,
    accessibility_status: match.accessibilityStatus,
    match_reasons: match.reasons,
    cover_letter_draft: match.coverLetterDraft,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('job_matches')
    .upsert(payload, { onConflict: 'user_id,job_id' })
    .select()
    .single();

  if (error) {
    console.error('[DB Error] Failed to save job match:', error.message);
    throw error;
  }

  return data;
}

/**
 * 6. Perform vector similarity search for jobs using pgvector RPC
 */
export async function matchJobsByVector(embedding: number[], threshold = 0.5, limit = 20) {
  const { data, error } = await supabase.rpc('match_jobs_for_candidate', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error('[DB Error] Vector match RPC error:', error.message);
    throw error;
  }

  return data;
}
