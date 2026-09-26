export interface DisabilityCategory {
  id: string;
  name: string;
  synonyms: string[];
  incompatibleDemands: string[];
  compatibleDemands: string[];
  assistiveTech: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export const DISABILITY_TAXONOMY: Record<string, DisabilityCategory> = {
  visual: {
    id: 'visual',
    name: 'Visual Impairment & Blindness',
    synonyms: ['blind', 'blindness', 'visually impaired', 'low vision', 'legal blindness', 'sight loss'],
    incompatibleDemands: ['robotics', 'robotics engineer', 'circuit assembly', 'soldering', 'driving', 'driver', 'visual ui design', 'graphic design', 'hardware assembly', 'warehouse labor', 'inspection'],
    compatibleDemands: ['screen reader compatible', 'digital software', 'backend development', 'python', 'data science', 'accessibility consulting'],
    assistiveTech: ['Screen Readers (NVDA/JAWS)', 'Braille Displays', 'Voice Command Systems'],
  },
  mobility: {
    id: 'mobility',
    name: 'Mobility & Physical Impairment',
    synonyms: ['wheelchair', 'wheelchair user', 'mobility impairment', 'paraplegic', 'quadriplegic', 'amputee', 'leg disability', 'walking disability'],
    incompatibleDemands: ['heavy lifting', 'lift 50 lbs', 'standing long hours', 'climbing ladders', 'robotics lab physical assembly', 'warehouse', 'cleaning physical', 'driving', 'construction'],
    compatibleDemands: ['remote work', 'desk job', 'wheelchair accessible office', 'software development', 'customer support'],
    assistiveTech: ['Wheelchair Ramps', 'Ergonomic Desk Setups', 'Voice-to-Text Software'],
  },
  auditory: {
    id: 'auditory',
    name: 'Auditory Impairment & Deafness',
    synonyms: ['deaf', 'deafness', 'hard of hearing', 'hearing loss', 'hearing impairment'],
    incompatibleDemands: ['cold calling', 'inbound call center', 'phone sales', 'audio engineering', 'live telephone support'],
    compatibleDemands: ['text chat support', 'software engineering', 'written documentation', 'async communication'],
    assistiveTech: ['Real-time Closed Captioning', 'ASL Interpreters', 'Text-based Messaging Apps'],
  },
  speech: {
    id: 'speech',
    name: 'Speech Impairment',
    synonyms: ['speech impairment', 'non-verbal', 'stuttering', 'vocal cord disability'],
    incompatibleDemands: ['phone sales', 'call center representative', 'public speaking', 'radio host'],
    compatibleDemands: ['coding', 'async communication', 'written support', 'data entry'],
    assistiveTech: ['Text-to-Speech Synthesizers', 'AAC Devices'],
  },
};

export const SKILL_TAXONOMY: Record<string, SkillCategory> = {
  embedded_robotics: {
    id: 'embedded_robotics',
    name: 'Embedded Systems & Robotics',
    skills: ['c', 'c++', 'embedded systems', 'robotics', 'arduino', 'raspberry pi', 'firmware', 'microcontrollers', 'ros', 'rtos', 'assembly'],
  },
  web_dev: {
    id: 'web_dev',
    name: 'Web & Frontend Development',
    skills: ['javascript', 'typescript', 'react', 'node.js', 'html', 'css', 'angular', 'vue', 'next.js', 'express', 'tailwind'],
  },
  mobile_dev: {
    id: 'mobile_dev',
    name: 'Mobile App Development',
    skills: ['flutter', 'dart', 'react native', 'ios', 'swift', 'android', 'kotlin'],
  },
  data_ai: {
    id: 'data_ai',
    name: 'Data Science & Artificial Intelligence',
    skills: ['python', 'machine learning', 'ai', 'data science', 'sql', 'postgres', 'pandas', 'pytorch', 'tensorflow', 'nlp'],
  },
  cloud_devops: {
    id: 'cloud_devops',
    name: 'Cloud Infrastructure & DevOps',
    skills: ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'sys admin', 'linux'],
  },
  manual_gigs: {
    id: 'manual_gigs',
    name: 'Manual Services & MicroGigs',
    skills: ['cleaning', 'warehouse', 'driving', 'maintenance', 'assembly', 'delivery', 'physical labor'],
  },
};

export interface RAGComparisonResult {
  hasConflict: boolean;
  scorePenalty: number;
  status: 'fully_accessible' | 'requires_review' | 'physical_conflict';
  reason: string;
}

/**
 * RAG Semantic Comparison Engine: Compares candidate disabilities against job title & description
 */
export function compareDisabilityVsJobDemands(disabilities: string[], jobTitle: string, jobDesc: string): RAGComparisonResult {
  if (!disabilities || disabilities.length === 0) {
    return {
      hasConflict: false,
      scorePenalty: 0,
      status: 'fully_accessible',
      reason: 'No disabilities specified.',
    };
  }

  const titleLower = jobTitle.toLowerCase();
  const descLower = jobDesc.toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  const cleanCandidateDisabilities = disabilities.map((d) => d.trim().toLowerCase());

  // 1. Check Visual Impairment / Blindness
  const isBlindOrVisuallyImpaired = cleanCandidateDisabilities.some((d) =>
    DISABILITY_TAXONOMY.visual.synonyms.some((syn) => d.includes(syn))
  );

  if (isBlindOrVisuallyImpaired) {
    const isRoboticsOrHardware = /\b(robotics|robotics engineer|hardware assembly|circuit|soldering|visual ui|graphic design|driver|driving)\b/i.test(titleLower) ||
                                 /\b(robotics lab|hardware soldering|physical assembly|circuit board inspection)\b/i.test(descLower);

    if (isRoboticsOrHardware) {
      return {
        hasConflict: true,
        scorePenalty: 0.8, // Massive penalty
        status: 'physical_conflict',
        reason: `Physical Conflict: Candidate with visual impairment (blindness) cannot perform physical Robotics hardware assembly, circuit inspection, or visual design tasks for "${jobTitle}".`,
      };
    }
  }

  // 2. Check Mobility Impairment / Wheelchair User
  const hasMobilityDisability = cleanCandidateDisabilities.some((d) =>
    DISABILITY_TAXONOMY.mobility.synonyms.some((syn) => d.includes(syn))
  );

  if (hasMobilityDisability) {
    const isHeavyPhysicalJob = /\b(heavy lifting|lift 50 lbs|physical labor|warehouse|cleaning physical|driving required|climb ladders)\b/i.test(descLower) ||
                               /\b(warehouse worker|cleaner|driver|laborer)\b/i.test(titleLower);

    if (isHeavyPhysicalJob) {
      return {
        hasConflict: true,
        scorePenalty: 0.8,
        status: 'physical_conflict',
        reason: `Physical Conflict: Candidate with mobility impairment cannot perform heavy physical labor, lifting, or driving required for "${jobTitle}".`,
      };
    }
  }

  // 3. Check Hearing Impairment / Deafness
  const hasHearingDisability = cleanCandidateDisabilities.some((d) =>
    DISABILITY_TAXONOMY.auditory.synonyms.some((syn) => d.includes(syn))
  );

  if (hasHearingDisability) {
    const isPhoneCallJob = /\b(cold calling|inbound call center|phone support exclusively)\b/i.test(descLower);
    if (isPhoneCallJob) {
      return {
        hasConflict: true,
        scorePenalty: 0.5,
        status: 'requires_review',
        reason: `Requires Review: Candidate with hearing impairment may require text/chat accommodations for phone-centric role "${jobTitle}".`,
      };
    }
  }

  return {
    hasConflict: false,
    scorePenalty: 0,
    status: 'fully_accessible',
    reason: 'Fully Compatible: Digital/remote environment matches candidate accessibility profile.',
  };
}
