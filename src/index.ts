import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformRegistry } from './handlers/index.js';
import { scoreAndFilterJobs } from './services/matcher.js';
import { getJobsWithCachePolicy } from './services/cacheManager.js';
import { processBatchUserMatches } from './services/batchProcessor.js';
import { generateAIApplication } from './services/aiApplicationService.js';
import { parseResumeContent } from './services/resumeParser.js';
import { DISABILITY_TAXONOMY, SKILL_TAXONOMY, compareDisabilityVsJobDemands } from './services/taxonomyManager.js';
import { scheduleConfig, updateScheduleConfig } from './config/scheduleConfig.js';
import { AIDraftRequest, CandidateProfile, JobSearchQuery, SearchJobsResponse } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static test client from public folder
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    handlers: Object.keys(platformRegistry),
    scheduleConfig,
  });
});

// GET & POST Schedule Configuration Endpoint
app.get('/api/config/schedule', (req: Request, res: Response) => {
  res.json(scheduleConfig);
});

app.post('/api/config/schedule', (req: Request, res: Response) => {
  const { refreshIntervalHours, refreshOnTagChange, cacheTtlSeconds } = req.body;
  const updated = updateScheduleConfig({ refreshIntervalHours, refreshOnTagChange, cacheTtlSeconds });
  res.json({ message: 'Schedule configuration updated successfully', scheduleConfig: updated });
});

// GET Full Disability & Skill Taxonomy Catalogs
app.get('/api/taxonomy', (req: Request, res: Response) => {
  res.json({
    disabilities: DISABILITY_TAXONOMY,
    skills: SKILL_TAXONOMY,
  });
});

// POST RAG Semantic Comparison Endpoint
app.post('/api/taxonomy/compare', (req: Request, res: Response): void => {
  const { disabilities = [], jobTitle = '', jobDescription = '' } = req.body as { disabilities: string[]; jobTitle: string; jobDescription: string };
  const result = compareDisabilityVsJobDemands(disabilities, jobTitle, jobDescription);
  res.json(result);
});

// 1. Candidate job search endpoint
app.post('/api/search-jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.body as JobSearchQuery & { forceRefresh?: boolean };
    const { skills = [], locations = [], forceRefresh = false } = query;

    if (!Array.isArray(skills) || !Array.isArray(locations)) {
      res.status(400).json({
        error: 'Invalid request payload. "skills" and "locations" must be arrays of strings.',
      });
      return;
    }

    const { jobs: rawJobs, fromCache, cacheAgeSeconds } = await getJobsWithCachePolicy(query, forceRefresh);
    const scoredJobs = scoreAndFilterJobs(rawJobs, query);
    const finalJobs = scoredJobs.slice(0, query.limit || 20);

    res.json({
      count: finalJobs.length,
      totalFetched: rawJobs.length,
      fromCache,
      cacheAgeSeconds,
      jobs: finalJobs,
    });
  } catch (error) {
    console.error('[JobSearch Error]:', error);
    res.status(500).json({ error: 'An unexpected error occurred while searching for jobs.' });
  }
});

// 2. Scheduled Batch User Matching Endpoint
app.post('/api/batch-search-jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { users = [], forceRefresh = false } = req.body as { users: CandidateProfile[]; forceRefresh?: boolean };

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({
        error: 'Invalid payload. "users" must be a non-empty array of candidate profiles.',
      });
      return;
    }

    const batchResult = await processBatchUserMatches(users, forceRefresh);
    res.json(batchResult);
  } catch (error) {
    console.error('[BatchSearch Error]:', error);
    res.status(500).json({ error: 'An unexpected error occurred during batch user processing.' });
  }
});

// 3. AI Application & Cover Letter Drafting Endpoint
app.post('/api/generate-application', async (req: Request, res: Response): Promise<void> => {
  try {
    const draftRequest = req.body as AIDraftRequest;

    if (!draftRequest.job || !draftRequest.job.title || !draftRequest.job.description) {
      res.status(400).json({
        error: 'Invalid payload. "job" object with "title" and "description" is required.',
      });
      return;
    }

    const aiResult = await generateAIApplication(draftRequest);
    res.json(aiResult);
  } catch (error) {
    console.error('[AI Application Generator Error]:', error);
    res.status(500).json({ error: 'An unexpected error occurred while generating the AI application draft.' });
  }
});

// 4. Resume Parsing Endpoint
app.post('/api/parse-resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeText = '' } = req.body as { resumeText?: string };

    if (!resumeText.trim()) {
      res.status(400).json({ error: 'Payload must contain non-empty "resumeText".' });
      return;
    }

    const parsedResult = parseResumeContent(resumeText);
    res.json(parsedResult);
  } catch (error) {
    console.error('[Resume Parser Error]:', error);
    res.status(500).json({ error: 'An unexpected error occurred while parsing resume.' });
  }
});

// Fallback to serve test UI for any non-API GET route
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Job Aggregator Service listening on port ${PORT}`);
  console.log(`🌐 Test Frontend UI available at http://localhost:${PORT}`);
  console.log(`⏰ Default Schedule Refresh Window: ${scheduleConfig.refreshIntervalHours} hours`);
  console.log(`=================================================`);
});
