import { ResumeParseResult } from '../types.js';
import { cleanHtmlAndEntities } from '../utils/textCleaner.js';

export function parseResumeContent(resumeText: string): ResumeParseResult {
  const cleanText = cleanHtmlAndEntities(resumeText);
  const textLower = cleanText.toLowerCase();

  // 1. Extract Links (GitHub, LinkedIn, Portfolio)
  const githubMatch = cleanText.match(/https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const linkedinMatch = cleanText.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const portfolioMatch = cleanText.match(/https?:\/\/(www\.)?[a-zA-Z0-9_-]+\.(io|com|dev|me|net)/i);

  // 2. Extract Common Skills via Keyword Taxonomy
  const knownSkills = [
    'python', 'javascript', 'typescript', 'c', 'c++', 'c#', 'java', 'golang', 'rust',
    'flutter', 'dart', 'react', 'react native', 'node.js', 'express', 'angular', 'vue',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb', 'firebase',
    'embedded systems', 'robotics', 'arduino', 'raspberry pi', 'testing', 'qa', 'sys admin',
    'git', 'ci/cd', 'devops', 'machine learning', 'ai', 'html', 'css', 'cleaning', 'wordpress'
  ];

  const extractedSkills: string[] = [];
  for (const skill of knownSkills) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.-])${escaped}(?:$|[^a-zA-Z0-9+#.-])`, 'i');
    if (regex.test(textLower)) {
      extractedSkills.push(skill);
    }
  }

  // 3. Estimate Total Years of Experience
  let estimatedExperienceYears = 2; // default fallback
  const expMatch = cleanText.match(/(\d+)\+?\s*(years?|yrs?)\s*(of)?\s*(experience|exp)/i);
  if (expMatch && expMatch[1]) {
    estimatedExperienceYears = parseInt(expMatch[1], 10);
  }

  // 4. Extract Bio Snippet (First 300 characters)
  const bioSnippet = cleanText.substring(0, 350).replace(/\s+/g, ' ').trim();

  return {
    extractedSkills,
    estimatedExperienceYears,
    extractedLinks: {
      github: githubMatch ? githubMatch[0] : undefined,
      linkedin: linkedinMatch ? linkedinMatch[0] : undefined,
      portfolio: portfolioMatch ? portfolioMatch[0] : undefined,
    },
    extractedBioSnippet: bioSnippet,
  };
}
