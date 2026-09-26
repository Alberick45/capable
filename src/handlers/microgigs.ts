import { RawJob } from '../types.js';

/**
 * MicroGigs Handler: Fetches quick tasks, freelance gigs, and local services
 */
export async function fetchMicroGigs(): Promise<RawJob[]> {
  // Sample feed of micro-gigs & quick tasks
  const gigList: RawJob[] = [
    {
      title: 'Local Office Cleaning & Organization Service',
      company: 'Metro Clean Services',
      location: 'Accra, Ghana',
      remote: false,
      url: 'https://example.com/gigs/office-cleaning',
      description: 'Looking for an energetic individual for light office cleaning, dusting, and organizing twice a week. Physical standing required.',
      tags: ['cleaning', 'gigs', 'local', 'part-time'],
      category: 'microgig',
      source: 'microgigs',
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'Quick Python Scripting & Data Formatting Gig',
      company: 'Freelance Client',
      location: 'Remote',
      remote: true,
      url: 'https://example.com/gigs/python-script',
      description: 'Small $150 gig to write a quick Python script that parses CSV files and formats JSON output. Fast payout upon completion.',
      tags: ['python', 'scripting', 'gigs', 'freelance'],
      category: 'microgig',
      source: 'microgigs',
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'WordPress Website Bug Fix & Plugin Setup',
      company: 'Digital Nomad Media',
      location: 'Remote',
      remote: true,
      url: 'https://example.com/gigs/wordpress-fix',
      description: 'Need a developer to fix CSS styling issue on WordPress site and setup contact form plugin. 2-3 hours task.',
      tags: ['wordpress', 'css', 'gigs', 'quick-cash'],
      category: 'microgig',
      source: 'microgigs',
      publishedAt: new Date().toISOString(),
    },
  ];

  return gigList;
}
