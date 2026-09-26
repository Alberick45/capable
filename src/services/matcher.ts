import { JobSearchQuery, RawJob, ScoredJob } from '../types.js';

/**
 * Escapes regex special characters in user input string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a skill token appears as a whole word or distinct term in text
 */
function containsKeyword(text: string, keyword: string): boolean {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return false;

  const escaped = escapeRegex(cleanKeyword);
  // Match full word boundary or non-alphanumeric boundary (e.g., node.js, c++, react-native)
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.-])${escaped}(?:$|[^a-zA-Z0-9+#.-])`, 'i');
  return regex.test(text);
}

export function scoreAndFilterJobs(jobs: RawJob[], query: JobSearchQuery): ScoredJob[] {
  const { skills = [], experience = [], locations = [], workPreference = 'any' } = query;
  
  const cleanSkills = skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const cleanLocations = locations.map((l) => l.trim().toLowerCase()).filter(Boolean);

  // Calculate user total/max experience years if provided
  const maxExperienceYears = experience.reduce((max, exp) => Math.max(max, exp.years || 0), 0);
  const hasJuniorProfile = experience.length > 0 && maxExperienceYears < 3;
  const hasSeniorProfile = maxExperienceYears >= 5;

  const scoredJobs: ScoredJob[] = [];

  for (const job of jobs) {
    const titleLower = job.title.toLowerCase();
    const descLower = job.description.toLowerCase();
    const locLower = job.location.toLowerCase();
    const combinedText = `${titleLower} ${descLower}`;

    const matchReasons: string[] = [];

    // --- 1. SKILL SCORE (Weight: 60%) ---
    const matchedSkills: string[] = [];
    const titleMatchedSkills: string[] = [];

    if (cleanSkills.length > 0) {
      for (const skill of cleanSkills) {
        const inTitle = containsKeyword(titleLower, skill);
        const inDesc = containsKeyword(descLower, skill);

        if (inTitle || inDesc) {
          matchedSkills.push(skill);
          if (inTitle) {
            titleMatchedSkills.push(skill);
          }
        }
      }
    }

    let skillScore = 0;
    if (cleanSkills.length > 0) {
      const baseRatio = matchedSkills.length / cleanSkills.length;
      // Bonus if matched skills appear directly in the job title
      const titleBonus = titleMatchedSkills.length > 0 ? 0.2 : 0;
      skillScore = Math.min(1.0, baseRatio + titleBonus);

      if (matchedSkills.length > 0) {
        matchReasons.push(`Skills matched: ${matchedSkills.join(', ')}`);
      }
    } else {
      // If no skills passed, default skill score is neutral 0.5
      skillScore = 0.5;
    }

    // --- 2. LOCATION & WORK PREFERENCE SCORE (Weight: 30%) ---
    let locationScore = 0.5; // neutral baseline

    const isJobRemote = job.remote || locLower.includes('remote') || locLower.includes('anywhere') || locLower.includes('work from home');

    if (workPreference === 'remote') {
      if (isJobRemote) {
        locationScore = 1.0;
        matchReasons.push('Remote preference matched');
      } else {
        locationScore = 0.1;
      }
    } else if (workPreference === 'on-site' || workPreference === 'hybrid') {
      if (!isJobRemote) {
        locationScore = 0.8;
      }
      // Check user specified locations match
      const locMatch = cleanLocations.some((loc) => locLower.includes(loc));
      if (locMatch) {
        locationScore = 1.0;
        matchReasons.push('Specified location matched');
      }
    } else {
      // 'any' preference
      if (isJobRemote) {
        locationScore = 0.9;
        matchReasons.push('Remote job available');
      } else if (cleanLocations.length > 0) {
        const locMatch = cleanLocations.some((loc) => locLower.includes(loc));
        if (locMatch) {
          locationScore = 1.0;
          matchReasons.push('Location matched');
        }
      } else {
        locationScore = 0.7;
      }
    }

    // --- 3. EXPERIENCE SOFT SIGNAL (Weight: 10%) ---
    let experienceScore = 0.5;
    const isSeniorTitle = /\b(senior|sr|lead|principal|architect|staff|head|vp|director)\b/i.test(titleLower);
    const isJuniorTitle = /\b(junior|jr|intern|trainee|entry|associate)\b/i.test(titleLower);

    if (hasJuniorProfile && isSeniorTitle) {
      experienceScore = 0.1; // soft penalty for senior jobs on junior profile
      matchReasons.push('Soft filter: Senior role for junior profile');
    } else if (hasSeniorProfile && isSeniorTitle) {
      experienceScore = 1.0;
      matchReasons.push('Senior role matched experience');
    } else if (hasJuniorProfile && isJuniorTitle) {
      experienceScore = 1.0;
      matchReasons.push('Junior/Entry role matched experience');
    } else {
      experienceScore = 0.6;
    }

    // --- WEIGHTED COMPOSITE SCORE ---
    const rawTotalScore = skillScore * 0.60 + locationScore * 0.30 + experienceScore * 0.10;
    const finalScore = Math.round(rawTotalScore * 100) / 100;

    // Filter out jobs with extremely low skill relevance if skills were explicitly provided
    if (cleanSkills.length > 0 && matchedSkills.length === 0) {
      continue; // Skip job if zero requested skills matched
    }

    scoredJobs.push({
      ...job,
      score: finalScore,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['General relevance'],
    });
  }

  // Sort descending by score
  scoredJobs.sort((a, b) => b.score - a.score);

  return scoredJobs;
}
