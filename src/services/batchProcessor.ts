import { getJobsWithCachePolicy } from './cacheManager.js';
import { scoreAndFilterJobs } from './matcher.js';
import { scheduleConfig } from '../config/scheduleConfig.js';
import { BatchSearchJobsResponse, BatchUserMatchResult, CandidateProfile } from '../types.js';

export async function processBatchUserMatches(users: CandidateProfile[], forceRefresh = false): Promise<BatchSearchJobsResponse> {
  console.log(`[BatchProcessor] Starting batch execution for ${users.length} user profiles. Schedule refresh window: ${scheduleConfig.refreshIntervalHours}h`);

  const userResults: BatchUserMatchResult[] = [];
  let totalFetchedAcrossPlatforms = 0;

  for (const user of users) {
    const userId = user.userId || user.email || `user_${Math.random().toString(36).substring(2, 9)}`;
    const userLimit = user.limit || 15;

    // Fetch jobs applying 24h cache + instant tag change refresh policy
    const { jobs: rawJobs, fromCache, cacheAgeSeconds } = await getJobsWithCachePolicy(user, forceRefresh);
    totalFetchedAcrossPlatforms = Math.max(totalFetchedAcrossPlatforms, rawJobs.length);

    // Score & filter specifically for this user
    const scored = scoreAndFilterJobs(rawJobs, user);
    const topJobs = scored.slice(0, userLimit);

    userResults.push({
      userId,
      profile: user,
      matchCount: topJobs.length,
      jobs: topJobs,
    });
  }

  return {
    totalUsersProcessed: users.length,
    totalFetchedJobs: totalFetchedAcrossPlatforms,
    timestamp: new Date().toISOString(),
    results: userResults,
  };
}
