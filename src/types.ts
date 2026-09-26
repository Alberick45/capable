export type WorkPreference = 'remote' | 'on-site' | 'hybrid' | 'any';

export interface Experience {
  title: string;
  years: number;
}

export interface CandidateProfile {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  age?: number;
  skills: string[];
  experience?: Experience[];
  locations: string[];
  workPreference: WorkPreference;
  disabilities?: string[];         // e.g. ["mobility impairment", "visually impaired"]
  accessibilityNeeds?: string[];   // e.g. ["screen reader compatible", "wheelchair accessible office", "remote preference"]
  github?: string;
  linkedin?: string;
  portfolio?: string;
  bio?: string;
  resumeText?: string;
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
  category?: 'professional' | 'microgig' | 'freelance';
  physicalRequirements?: string[];
  source: string;
  publishedAt?: string;
}

export interface ScoredJob extends RawJob {
  score: number;
  accessibilityScore?: number;
  accessibilityStatus?: 'fully_accessible' | 'requires_review' | 'physical_conflict';
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
  apiKey?: string;
}

export interface AIDraftResponse {
  fitScore: number;
  accessibilityAssessment: string;
  coverLetterDraft: string;
  keyHighlights: string[];
  recommendedStrategy: string;
  autofillPayload: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    portfolio: string;
    coverLetter: string;
  };
}

export interface ResumeParseResult {
  extractedSkills: string[];
  estimatedExperienceYears: number;
  extractedLinks: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
  extractedBioSnippet: string;
}

export type HandlerType = 'playwright' | 'api';

export interface PlatformHandler {
  name: string;
  type: HandlerType;
  url: string;
  fetchJobs(): Promise<RawJob[]>;
}
