export type WorkPreference = 'remote' | 'on-site' | 'hybrid' | 'any';

export interface Experience {
  title: string;
  years: number;
}

export interface CandidateProfile {
  userId?: string;
  name?: string;
  email?: string;
  dob?: string;       // e.g. "1998-05-15"
  age?: number;        // e.g. 28
  skills: string[];
  experience?: Experience[];
  locations: string[];
  workPreference: WorkPreference;
  bio?: string;
  limit?: number;
}

export interface JobSearchQuery extends CandidateProfile {}

export interface RawJob {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  tags?: string[];
  source: string;
  publishedAt?: string;
}

export interface ScoredJob extends RawJob {
  score: number;
  matchReasons?: string[];
}

export interface SearchJobsResponse {
  count: number;
  totalFetched: number;
  jobs: ScoredJob[];
}

export interface BatchUserMatchResult {
  userId: string;
  profile: CandidateProfile;
  matchCount: number;
  jobs: ScoredJob[];
}

export interface BatchSearchJobsResponse {
  totalUsersProcessed: number;
  totalFetchedJobs: number;
  timestamp: string;
  results: BatchUserMatchResult[];
}

export interface AIDraftRequest {
  job: {
    title: string;
    company: string;
    description: string;
    url?: string;
    location?: string;
  };
  candidate: CandidateProfile;
  apiKey?: string; // Optional OpenAI/Gemini/Anthropic API key
}

export interface AIDraftResponse {
  fitScore: number;
  fitAssessment: string;
  coverLetterDraft: string;
  keyHighlights: string[];
  recommendedStrategy: string;
}

export type HandlerType = 'playwright' | 'api';

export interface PlatformHandler {
  name: string;
  type: HandlerType;
  url: string;
  fetchJobs(): Promise<RawJob[]>;
}
