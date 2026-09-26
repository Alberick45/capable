import { platformRegistry } from '../handlers/index.js';
import { scheduleConfig } from '../config/scheduleConfig.js';
import { JobSearchQuery, RawJob } from '../types.js';

interface RawJobCache {
  timestamp: number;
  jobs: RawJob[];
}

interface UserQueryCache {
  timestamp: number;
  tagSignature: string;
  jobs: RawJob[];
}

// In-memory cache store
let globalPlatformCache: RawJobCache | null = null;
const userTagCacheMap = new Map<string, UserQueryCache>();

/**
 * Generates a normalized signature string for candidate tags/skills
 */
export function getTagSignature(skills: string[], locations: string[], workPref: string): string {
  const normSkills = [...skills].map((s) => s.trim().toLowerCase()).sort().join(',');
  const normLocs = [...locations].map((l) => l.trim().toLowerCase()).sort().join(',');
  return `skills:[${normSkills}]_locs:[${normLocs}]_pref:[${workPref}]`;
}

/**
 * Fetches platform jobs with intelligent 24h caching & instant refresh on tag changes.
 */
export async function getJobsWithCachePolicy(query: JobSearchQuery, forceRefresh = false): Promise<{ jobs: RawJob[]; fromCache: boolean; cacheAgeSeconds: number }> {
  const now = Date.now();
  const currentTagSig = getTagSignature(query.skills || [], query.locations || [], query.workPreference || 'any');
  const userKey = query.userId || query.email || 'default_user';

  const userCache = userTagCacheMap.get(userKey);
  const cacheTtlMs = scheduleConfig.cacheTtlSeconds * 1000;

  // 1. Check if user cache exists, is not expired, AND candidate tags/skills haven't changed
  if (
    !forceRefresh &&
    userCache &&
    userCache.tagSignature === currentTagSig &&
    now - userCache.timestamp < cacheTtlMs
  ) {
    const ageSec = Math.round((now - userCache.timestamp) / 1000);
    console.log(`[CacheManager] Serving cached jobs for ${userKey}. Cache age: ${ageSec}s / ${scheduleConfig.cacheTtlSeconds}s (Tags unchanged)`);
    return { jobs: userCache.jobs, fromCache: true, cacheAgeSeconds: ageSec };
  }

  // Reason for cache miss / refresh
  let refreshReason = 'Initial query';
  if (forceRefresh) refreshReason = 'Manual force refresh requested';
  else if (!userCache) refreshReason = 'No previous cache found';
  else if (userCache.tagSignature !== currentTagSig) refreshReason = `Tags/skills changed (${userCache.tagSignature} ➔ ${currentTagSig})`;
  else if (now - userCache.timestamp >= cacheTtlMs) refreshReason = `Cache expired (> ${scheduleConfig.refreshIntervalHours} hours old)`;

  console.log(`[CacheManager] Refreshing platform listings for ${userKey}. Reason: ${refreshReason}`);

  // 2. Check if global platform cache is fresh enough (< 24h) to avoid hitting APIs unnecessarily if only user tag filter changed
  let rawJobs: RawJob[] = [];

  if (!forceRefresh && globalPlatformCache && now - globalPlatformCache.timestamp < cacheTtlMs) {
    console.log(`[CacheManager] Using fresh global platform cache (${Math.round((now - globalPlatformCache.timestamp)/1000)}s old).`);
    rawJobs = globalPlatformCache.jobs;
  } else {
    console.log(`[CacheManager] Fetching live feeds from all 5 platform handlers concurrently...`);
    const handlerEntries = Object.entries(platformRegistry);
    const fetchPromises = handlerEntries.map(async ([name, handler]) => {
      try {
        const jobs = await handler.fetchJobs();
        return jobs;
      } catch (err) {
        console.error(`[CacheManager] Error in handler ${name}:`, err);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const res of results) {
      if (res.status === 'fulfilled') {
        rawJobs.push(...res.value);
      }
    }

    // Update global platform cache
    globalPlatformCache = { timestamp: now, jobs: rawJobs };
  }

  // 3. Update user-specific query cache
  userTagCacheMap.set(userKey, {
    timestamp: now,
    tagSignature: currentTagSig,
    jobs: rawJobs,
  });

  return { jobs: rawJobs, fromCache: false, cacheAgeSeconds: 0 };
}
