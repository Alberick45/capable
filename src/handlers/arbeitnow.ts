import axios from 'axios';
import { RawJob } from '../types.js';
import { cleanHtmlAndEntities } from '../utils/textCleaner.js';

interface ArbeitnowJobItem {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  url: string;
  tags: string[];
  description: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data: ArbeitnowJobItem[];
}

export async function fetchArbeitnow(): Promise<RawJob[]> {
  const url = 'https://www.arbeitnow.com/api/job-board-api';

  try {
    const response = await axios.get<ArbeitnowResponse>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobAggregatorService/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (!response.data || !Array.isArray(response.data.data)) {
      console.warn('[Arbeitnow Handler Warning]: Response data missing or invalid array');
      return [];
    }

    const jobs: RawJob[] = [];

    for (const item of response.data.data) {
      if (!item.title || !item.company_name) {
        continue;
      }

      const cleanTitle = cleanHtmlAndEntities(item.title);
      const cleanDesc = cleanHtmlAndEntities(item.description || '');

      jobs.push({
        title: cleanTitle,
        company: cleanHtmlAndEntities(item.company_name),
        location: item.location || (item.remote ? 'Remote' : 'On-site'),
        remote: Boolean(item.remote),
        url: item.url,
        description: cleanDesc,
        tags: Array.isArray(item.tags) ? item.tags : [],
        source: 'arbeitnow',
        publishedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : undefined,
      });
    }

    return jobs;
  } catch (error) {
    console.error('[Arbeitnow Handler Error]:', error);
    throw error;
  }
}
