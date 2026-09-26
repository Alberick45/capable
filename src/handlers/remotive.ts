import axios from 'axios';
import { RawJob } from '../types.js';

interface RemotiveJobItem {
  id?: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  tags?: string[];
  candidate_required_location?: string;
  publication_date?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs: RemotiveJobItem[];
}

export async function fetchRemotive(): Promise<RawJob[]> {
  const url = 'https://remotive.com/api/remote-jobs';

  try {
    const response = await axios.get<RemotiveResponse>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobAggregatorService/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (!response.data || !Array.isArray(response.data.jobs)) {
      console.warn('[Remotive Handler Warning]: Response missing jobs array');
      return [];
    }

    const jobs: RawJob[] = [];

    for (const item of response.data.jobs) {
      if (!item.title || !item.company_name) {
        continue;
      }

      const rawDesc = item.description || '';
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const locationStr = item.candidate_required_location || 'Remote';

      const tagList = Array.isArray(item.tags) ? item.tags : [];
      if (item.category && !tagList.includes(item.category)) {
        tagList.push(item.category);
      }

      jobs.push({
        title: item.title,
        company: item.company_name,
        location: locationStr,
        remote: true,
        url: item.url,
        description: cleanDesc,
        tags: tagList,
        source: 'remotive',
        publishedAt: item.publication_date,
      });
    }

    return jobs;
  } catch (error) {
    console.error('[Remotive Handler Error]:', error);
    throw error;
  }
}
