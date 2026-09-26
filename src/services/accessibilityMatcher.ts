import { compareDisabilityVsJobDemands } from './taxonomyManager.js';
import { CandidateProfile, RawJob } from '../types.js';

export interface AccessibilityMatchResult {
  score: number; // 0.0 to 1.0
  status: 'fully_accessible' | 'requires_review' | 'physical_conflict';
  assessment: string;
}

export function evaluateAccessibilityMatch(job: RawJob, candidate: CandidateProfile): AccessibilityMatchResult {
  const disabilities = candidate.disabilities || [];
  const accessibilityNeeds = candidate.accessibilityNeeds || [];

  if (disabilities.length === 0 && accessibilityNeeds.length === 0) {
    return {
      score: 1.0,
      status: 'fully_accessible',
      assessment: 'Standard workplace accessibility.',
    };
  }

  // Execute RAG Taxonomy Semantic Comparison
  const ragResult = compareDisabilityVsJobDemands(disabilities, job.title, job.description);

  if (ragResult.hasConflict) {
    return {
      score: Math.max(0.1, 1.0 - ragResult.scorePenalty),
      status: ragResult.status,
      assessment: ragResult.reason,
    };
  }

  const isRemote = job.remote || /\b(remote|work from home|telecommute)\b/i.test(job.location);
  if (isRemote) {
    return {
      score: 1.0,
      status: 'fully_accessible',
      assessment: 'Fully Accessible: 100% Remote digital environment with flexible accommodations.',
    };
  }

  return {
    score: 0.85,
    status: 'fully_accessible',
    assessment: 'Accessible: Standard digital/office environment compatible with candidate profile.',
  };
}
