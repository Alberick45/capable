import { PlatformHandler } from '../types.js';
import { fetchWeWorkRemotely } from './weworkremotely.js';
import { fetchRemoteOK } from './remoteok.js';
import { fetchArbeitnow } from './arbeitnow.js';
import { fetchRemotive } from './remotive.js';
import { fetchJobspresso } from './jobspresso.js';

export const platformRegistry: Record<string, PlatformHandler> = {
  weworkremotely: {
    name: 'weworkremotely',
    type: 'api',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    fetchJobs: fetchWeWorkRemotely,
  },
  remoteok: {
    name: 'remoteok',
    type: 'api',
    url: 'https://remoteok.com/api',
    fetchJobs: fetchRemoteOK,
  },
  arbeitnow: {
    name: 'arbeitnow',
    type: 'api',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    fetchJobs: fetchArbeitnow,
  },
  remotive: {
    name: 'remotive',
    type: 'api',
    url: 'https://remotive.com/api/remote-jobs',
    fetchJobs: fetchRemotive,
  },
  jobspresso: {
    name: 'jobspresso',
    type: 'api',
    url: 'https://jobspresso.co/feed/',
    fetchJobs: fetchJobspresso,
  },
};
