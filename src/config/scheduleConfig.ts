export interface ScheduleConfig {
  /** Default search refresh interval in hours (Default: 24 hours) */
  refreshIntervalHours: number;
  /** Cache Time-To-Live in seconds (Default: 86,400s = 24 hours) */
  cacheTtlSeconds: number;
  /** Automatically trigger instant refresh if user tags/skills change */
  refreshOnTagChange: boolean;
}

export const scheduleConfig: ScheduleConfig = {
  refreshIntervalHours: parseInt(process.env.REFRESH_INTERVAL_HOURS || '24', 10),
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '86400', 10),
  refreshOnTagChange: process.env.REFRESH_ON_TAG_CHANGE !== 'false',
};

/**
 * Updates the runtime schedule configuration
 */
export function updateScheduleConfig(newConfig: Partial<ScheduleConfig>): ScheduleConfig {
  if (newConfig.refreshIntervalHours !== undefined && newConfig.refreshIntervalHours > 0) {
    scheduleConfig.refreshIntervalHours = newConfig.refreshIntervalHours;
    scheduleConfig.cacheTtlSeconds = newConfig.refreshIntervalHours * 3600;
  }
  if (newConfig.cacheTtlSeconds !== undefined && newConfig.cacheTtlSeconds > 0) {
    scheduleConfig.cacheTtlSeconds = newConfig.cacheTtlSeconds;
    scheduleConfig.refreshIntervalHours = Math.round(newConfig.cacheTtlSeconds / 3600);
  }
  if (newConfig.refreshOnTagChange !== undefined) {
    scheduleConfig.refreshOnTagChange = newConfig.refreshOnTagChange;
  }
  return { ...scheduleConfig };
}
