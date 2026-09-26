import { evaluateAccessibilityMatch } from './accessibilityMatcher.js';
import { JobSearchQuery, RawJob, ScoredJob } from '../types.js';
import { cleanHtmlAndEntities } from '../utils/textCleaner.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(text: string, keyword: string): boolean {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return false;
  const escaped = escapeRegex(cleanKeyword);
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.-])${escaped}(?:$|[^a-zA-Z0-9+#.-])`, 'i');
  return regex.test(text);
}

function isLocationMatch(jobLocation: string, targetLocations: string[]): boolean {
  if (targetLocations.length === 0) return true;
  const jobLocLower = jobLocation.toLowerCase();

  for (const target of targetLocations) {
    const targetLower = target.trim().toLowerCase();
    if (!targetLower) continue;
    if (jobLocLower.includes(targetLower)) return true;

    const tokens = targetLower.split(/[\s,]+/).filter((t) => t.length > 2);
    for (const token of tokens) {
      if (token !== 'remote' && jobLocLower.includes(token)) return true;
    }
  }
  return false;
}

export function scoreAndFilterJobs(jobs: RawJob[], query: JobSearchQuery): ScoredJob[] {
  const { skills = [], experience = [], locations = [], workPreference = 'any', disabilities = [], accessibilityNeeds = [] } = query;

  const cleanSkills = skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const cleanLocations = locations.map((l) => l.trim().toLowerCase()).filter(Boolean);

  const maxExperienceYears = experience.reduce((max, exp) => Math.max(max, exp.years || 0), 0);
  const hasJuniorProfile = experience.length > 0 && maxExperienceYears < 3;
  const hasSeniorProfile = maxExperienceYears >= 5;

  const scoredJobs: ScoredJob[] = [];

  for (const job of jobs) {
    const isJobRemote = job.remote || /\b(remote|anywhere|work from home|telecommute)\b/i.test(job.location);
    const jobLocLower = job.location.toLowerCase();

    // --- ACCESSIBILITY & DISABILITY MATCHING ---
    const accessEval = evaluateAccessibilityMatch(job, query);

    // If there is a strict physical conflict (e.g. wheelchair user vs heavy warehouse labor/climbing), filter out job
    if (accessEval.status === 'physical_conflict' && (disabilities.length > 0 || accessibilityNeeds.length > 0)) {
      continue; // Skip job due to physical conflict
    }

    // --- STRICT WORK PREFERENCE FILTERING ---
    if (workPreference === 'on-site') {
      if (isJobRemote) continue;
    } else if (workPreference === 'remote') {
      if (!isJobRemote) continue;
    } else if (workPreference === 'hybrid') {
      if (!isJobRemote && !jobLocLower.includes('hybrid')) {
        if (cleanLocations.length > 0 && !isLocationMatch(job.location, cleanLocations)) {
          continue;
        }
      }
    }

    // --- STRICT LOCATION FILTERING ---
    if (cleanLocations.length > 0) {
      const isCandidateAllowingRemote = workPreference === 'remote' || workPreference === 'any' || cleanLocations.some((l) => l.includes('remote'));

      if (!isJobRemote) {
        if (!isLocationMatch(job.location, cleanLocations)) {
          continue;
        }
      } else if (!isCandidateAllowingRemote) {
        continue;
      }
    }

    // --- SKILL MATCHING ---
    const cleanDesc = cleanHtmlAndEntities(job.description);
    const cleanTitle = cleanHtmlAndEntities(job.title);
    const titleLower = cleanTitle.toLowerCase();
    const descLower = cleanDesc.toLowerCase();

    const matchedSkills: string[] = [];
    const titleMatchedSkills: string[] = [];

    if (cleanSkills.length > 0) {
      for (const skill of cleanSkills) {
        const inTitle = containsKeyword(titleLower, skill);
        const inDesc = containsKeyword(descLower, skill);

        if (inTitle || inDesc) {
          matchedSkills.push(skill);
          if (inTitle) titleMatchedSkills.push(skill);
        }
      }

      if (matchedSkills.length === 0) {
        continue;
      }
    }

    const matchReasons: string[] = [];

    // --- SKILL SCORE (Weight: 50%) ---
    let skillScore = 0.5;
    if (cleanSkills.length > 0) {
      const baseRatio = matchedSkills.length / cleanSkills.length;
      const titleBonus = titleMatchedSkills.length > 0 ? 0.2 : 0;
      skillScore = Math.min(1.0, baseRatio + titleBonus);
      matchReasons.push(`Skills matched: ${matchedSkills.join(', ')}`);
    }

    // --- LOCATION SCORE (Weight: 25%) ---
    let locationScore = 0.7;
    if (cleanLocations.length > 0 && isLocationMatch(job.location, cleanLocations)) {
      locationScore = 1.0;
      matchReasons.push(`Target location matched: ${job.location}`);
    } else if (isJobRemote && (workPreference === 'remote' || workPreference === 'any')) {
      locationScore = 0.9;
      matchReasons.push('Remote listing available');
    }

    // --- ACCESSIBILITY SCORE (Weight: 15%) ---
    const accessibilityScore = accessEval.score;
    if (disabilities.length > 0 || accessibilityNeeds.length > 0) {
      matchReasons.push(`Accessibility: ${accessEval.assessment}`);
    }

    // --- EXPERIENCE SCORE (Weight: 10%) ---
    let experienceScore = 0.6;
    const isSeniorTitle = /\b(senior|sr|lead|principal|architect|staff|head|vp|director)\b/i.test(titleLower);
    const isJuniorTitle = /\b(junior|jr|intern|trainee|entry|associate)\b/i.test(titleLower);

    if (hasJuniorProfile && isSeniorTitle) {
      experienceScore = 0.2;
      matchReasons.push('Soft filter: Senior role for junior profile');
    } else if (hasSeniorProfile && isSeniorTitle) {
      experienceScore = 1.0;
      matchReasons.push('Senior role matched experience');
    } else if (hasJuniorProfile && isJuniorTitle) {
      experienceScore = 1.0;
      matchReasons.push('Junior/Entry role matched experience');
    }

    const rawTotalScore = skillScore * 0.50 + locationScore * 0.25 + accessibilityScore * 0.15 + experienceScore * 0.10;
    const finalScore = Math.round(rawTotalScore * 100) / 100;

    scoredJobs.push({
      ...job,
      title: cleanTitle,
      description: cleanDesc,
      score: finalScore,
      accessibilityScore: accessEval.score,
      accessibilityStatus: accessEval.status,
      matchReasons,
    });
  }

  scoredJobs.sort((a, b) => b.score - a.score);
  return scoredJobs;
}
