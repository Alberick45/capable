import Parser from 'rss-parser';
import { RawJob } from '../types.js';

const parser = new Parser();

export async function fetchJobspresso(): Promise<RawJob[]> {
  const feedUrl = 'https://jobspresso.co/feed/';

  try {
    const feed = await parser.parseURL(feedUrl);
    const jobs: RawJob[] = [];

    for (const item of feed.items || []) {
      const rawTitle = item.title || 'Untitled Position';
      let company = 'Jobspresso Employer';
      let title = rawTitle;

      // Titles often formatted as "Company Name: Job Title" or "Job Title at Company"
      if (rawTitle.includes(':')) {
        const parts = rawTitle.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      } else if (rawTitle.includes(' at ')) {
        const parts = rawTitle.split(' at ');
        title = parts[0].trim();
        company = parts.slice(1).join(' at ').trim();
      }

      const rawDesc = item.content || item.contentSnippet || item.summary || '';
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      jobs.push({
        title,
        company,
        location: 'Remote',
        remote: true,
        url: item.link || feedUrl,
        description: cleanDesc,
        source: 'jobspresso',
        publishedAt: item.pubDate,
      });
    }

    return jobs;
  } catch (error) {
    console.error('[Jobspresso Handler Error]:', error);
    throw error;
  }
}
