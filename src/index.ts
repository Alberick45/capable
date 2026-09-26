import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformRegistry } from './handlers/index.js';
import { scoreAndFilterJobs } from './services/matcher.js';
import { JobSearchQuery, RawJob, SearchJobsResponse } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static test client from public folder
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Health check endpoint for Render
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    handlers: Object.keys(platformRegistry),
  });
});

// Main job search endpoint
app.post('/api/search-jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      skills = [],
      experience = [],
      locations = [],
      workPreference = 'any',
      limit = 20,
    } = req.body as JobSearchQuery;

    // Validate inputs basic types
    if (!Array.isArray(skills) || !Array.isArray(locations)) {
      res.status(400).json({
        error: 'Invalid request payload. "skills" and "locations" must be arrays of strings.',
      });
      return;
    }

    console.log(`[JobSearch] Executing search query for skills: [${skills.join(', ')}], locations: [${locations.join(', ')}], preference: ${workPreference}`);

    // Fetch from all registered handlers concurrently using Promise.allSettled
    const handlerEntries = Object.entries(platformRegistry);
    const fetchPromises = handlerEntries.map(async ([name, handler]) => {
      try {
        console.log(`[JobSearch] Fetching jobs from handler: ${name}...`);
        const jobs = await handler.fetchJobs();
        console.log(`[JobSearch] ${name} returned ${jobs.length} jobs.`);
        return jobs;
      } catch (err) {
        console.error(`[JobSearch] Error in handler ${name}:`, err);
        return []; // Return empty array so request succeeds with other handlers
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const allRawJobs: RawJob[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allRawJobs.push(...result.value);
      }
    }

    // Score and filter matching jobs
    const query: JobSearchQuery = { skills, experience, locations, workPreference, limit };
    const scoredJobs = scoreAndFilterJobs(allRawJobs, query);

    // Limit output results if specified
    const finalJobs = scoredJobs.slice(0, limit);

    const responseData: SearchJobsResponse = {
      count: finalJobs.length,
      totalFetched: allRawJobs.length,
      jobs: finalJobs,
    };

    res.json(responseData);
  } catch (error) {
    console.error('[JobSearch Controller Error]:', error);
    res.status(500).json({
      error: 'An unexpected error occurred while searching for jobs.',
    });
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
  console.log(`=================================================`);
});
