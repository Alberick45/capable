import axios from 'axios';
import { evaluateAccessibilityMatch } from './accessibilityMatcher.js';
import { AIDraftRequest, AIDraftResponse } from '../types.js';

export async function generateAIApplication(request: AIDraftRequest): Promise<AIDraftResponse> {
  const { job, candidate, apiKey } = request;

  const candidateSkills = (candidate.skills || []).join(', ');
  const expYears = (candidate.experience || []).reduce((sum, e) => sum + (e.years || 0), 0);
  const candidateBio = candidate.bio || `Experienced professional specializing in ${candidateSkills}.`;
  const candidateName = candidate.name || 'Applicant';

  // Evaluate Disability & Accessibility Match
  const accessResult = evaluateAccessibilityMatch({
    title: job.title,
    company: job.company,
    location: job.location || 'Remote',
    remote: (job.location || '').toLowerCase().includes('remote'),
    url: job.url || '',
    description: job.description,
    source: 'job_board',
  }, candidate);

  // Social & Portfolio links
  const linksList: string[] = [];
  if (candidate.github) linksList.push(`GitHub: ${candidate.github}`);
  if (candidate.linkedin) linksList.push(`LinkedIn: ${candidate.linkedin}`);
  if (candidate.portfolio) linksList.push(`Portfolio: ${candidate.portfolio}`);
  const linksSection = linksList.length > 0 ? `\n\nProfessional Links:\n${linksList.join('\n')}` : '';

  // 1. OpenAI Live Call if API key supplied
  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI Career Coach and Application Assistant. Analyze job descriptions, candidate profiles (including accessibility needs, resume details, GitHub/LinkedIn links), evaluate fit, and draft compelling personalized cover letter pitches.',
            },
            {
              role: 'user',
              content: `
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Job Description: ${job.description.substring(0, 1500)}

Candidate Profile:
Name: ${candidateName}
Skills: ${candidateSkills}
Total Experience: ${expYears} years
Links: ${candidate.github || ''} ${candidate.linkedin || ''} ${candidate.portfolio || ''}
Bio/Summary: ${candidateBio}
Accessibility Needs/Disabilities: ${(candidate.disabilities || []).join(', ')}

Task:
Generate a JSON object with:
- fitScore (0-100)
- accessibilityAssessment (string)
- keyHighlights (string array)
- coverLetterDraft (3-paragraph pitch including candidate links)
- recommendedStrategy (string)
              `,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiData = JSON.parse(response.data.choices[0].message.content);

      return {
        ...aiData,
        autofillPayload: {
          fullName: candidateName,
          email: candidate.email || '',
          phone: candidate.phone || '',
          linkedin: candidate.linkedin || '',
          github: candidate.github || '',
          portfolio: candidate.portfolio || '',
          coverLetter: aiData.coverLetterDraft,
        },
      };
    } catch (err) {
      console.warn('[AI Application Generator] OpenAI API call failed, falling back to local engine:', err);
    }
  }

  // 2. Local Fallback Generator Engine
  const jobDescLower = job.description.toLowerCase();
  const matchedSkills = (candidate.skills || []).filter((s) => jobDescLower.includes(s.toLowerCase()));
  const fitScore = Math.min(98, Math.max(50, Math.round(60 + matchedSkills.length * 10 + Math.min(expYears * 2, 15))));

  const coverLetterDraft = `Dear Hiring Manager at ${job.company},

I am writing to express my strong enthusiasm for the ${job.title} position. With ${expYears} year(s) of practical technical experience and core skills in ${candidateSkills}, I am confident in my ability to make an immediate impact on your team.

Having reviewed your requirements for ${job.title}, I noted your focus on effective execution. In my work, ${candidateBio} My technical background aligns directly with your stack, particularly in ${matchedSkills.length > 0 ? matchedSkills.join(', ') : candidateSkills}.

I would welcome the opportunity to discuss how my proactive mindset can support ${job.company}'s growth.${linksSection}

Best regards,
${candidateName}`;

  return {
    fitScore,
    accessibilityAssessment: accessResult.assessment,
    keyHighlights: [
      `Direct skill overlap: ${matchedSkills.length > 0 ? matchedSkills.join(', ') : candidateSkills}`,
      `Demonstrated track record of ${expYears}+ years experience in technical development`,
      `Accessibility Assessment: ${accessResult.assessment}`,
    ],
    coverLetterDraft,
    recommendedStrategy: `Highlight ${matchedSkills[0] || 'core technical projects'} and include your GitHub/LinkedIn links when submitting to ${job.company}.`,
    autofillPayload: {
      fullName: candidateName,
      email: candidate.email || '',
      phone: candidate.phone || '',
      linkedin: candidate.linkedin || '',
      github: candidate.github || '',
      portfolio: candidate.portfolio || '',
      coverLetter: coverLetterDraft,
    },
  };
}
