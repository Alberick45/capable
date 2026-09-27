import { supabase } from '../config/supabase.js';
import { CandidateProfile, RawJob, ScoredJob } from '../types.js';

/**
 * 1. Create or get existing user by username
 */
export async function getOrCreateUserByUsername(username: string) {
  const cleanUsername = username.trim().toLowerCase();

  // Try fetching existing user
  const { data: existingUser, error: fetchError } = await supabase
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
export async function saveJobsToDatabase(jobs: RawJob[]) {
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

  // Upsert on URL conflict
  const { data, error } = await supabase
    .from('jobs')
    .upsert(jobPayloads, { onConflict: 'url', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('[DB Error] Failed to save jobs:', error.message);
  }

  return data || [];
}

/**
 * 4. Perform vector similarity search for jobs using pgvector RPC
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
