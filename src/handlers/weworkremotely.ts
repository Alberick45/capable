import Parser from 'rss-parser';
import { RawJob } from '../types.js';

const parser = new Parser();

export async function fetchWeWorkRemotely(): Promise<RawJob[]> {
  const feedUrl = 'https://weworkremotely.com/remote-jobs.rss';
  
  try {
    const feed = await parser.parseURL(feedUrl);
    const jobs: RawJob[] = [];

    for (const item of feed.items || []) {
      const rawTitle = item.title || 'Untitled Role';
      let company = 'WeWorkRemotely Listed';
      let title = rawTitle;

      // WeWorkRemotely titles often follow "Company Name: Job Title"
      if (rawTitle.includes(':')) {
        const parts = rawTitle.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      }

      // Clean HTML tags from content if present
      const rawDesc = item.content || item.contentSnippet || item.summary || '';
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      jobs.push({
        title,
        company,
        location: 'Remote',
        remote: true,
        url: item.link || feedUrl,
        description: cleanDesc,
        source: 'weworkremotely',
        publishedAt: item.pubDate,
      });
    }

    return jobs;
  } catch (error) {
    console.error('[WeWorkRemotely Handler Error]:', error);
    throw error;
  }
}
