import Parser from 'rss-parser';
import { RawJob } from '../types.js';
import { cleanHtmlAndEntities } from '../utils/textCleaner.js';

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

      if (rawTitle.includes(':')) {
        const parts = rawTitle.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      }

      const cleanTitle = cleanHtmlAndEntities(title);
      const cleanDesc = cleanHtmlAndEntities(item.content || item.contentSnippet || item.summary || '');

      jobs.push({
        title: cleanTitle,
        company: cleanHtmlAndEntities(company),
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
