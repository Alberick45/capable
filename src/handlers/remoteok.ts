import axios from 'axios';
import { RawJob } from '../types.js';
import { cleanHtmlAndEntities } from '../utils/textCleaner.js';

interface RemoteOKItem {
  id?: string;
  slug?: string;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  url?: string;
  apply_url?: string;
  legal?: string;
}

export async function fetchRemoteOK(): Promise<RawJob[]> {
  const url = 'https://remoteok.com/api';

  try {
    const response = await axios.get<RemoteOKItem[]>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobAggregatorService/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (!Array.isArray(response.data)) {
      console.warn('[RemoteOK Handler Warning]: Response is not an array');
      return [];
    }

    const jobs: RawJob[] = [];

    for (const item of response.data) {
      if (!item.position || !item.company) {
        continue;
      }

      const cleanTitle = cleanHtmlAndEntities(item.position);
      const cleanDesc = cleanHtmlAndEntities(item.description || '');

      const jobUrl = item.url || item.apply_url || (item.slug ? `https://remoteok.com/remote-jobs/${item.slug}` : 'https://remoteok.com');

      jobs.push({
        title: cleanTitle,
        company: cleanHtmlAndEntities(item.company),
        location: item.location || 'Remote',
        remote: true,
        url: jobUrl,
        description: cleanDesc,
        tags: Array.isArray(item.tags) ? item.tags : [],
        source: 'remoteok',
        publishedAt: item.date,
      });
    }

    return jobs;
  } catch (error) {
    console.error('[RemoteOK Handler Error]:', error);
    throw error;
  }
}
