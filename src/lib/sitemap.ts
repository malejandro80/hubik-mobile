import { ISO_DATE_PATTERN, ROBOTS_DISALLOWED_PATHS, SITEMAP_NAMESPACE } from '../constants/sitemap';
import { buildListingUrl } from './listingMetadata';
import { Property } from '../types/property';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export interface SitemapListing {
  id: string;
  title: string;
  created_at: string;
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NAMESPACE}">\n${urls}\n</urlset>\n`;
}

export function buildSitemapEntries(listings: SitemapListing[], origin: string): SitemapEntry[] {
  return listings.map((listing) => {
    const loc = buildListingUrl({ id: listing.id, title: listing.title } as Property, origin);
    const lastmod = ISO_DATE_PATTERN.exec(listing.created_at ?? '')?.[0];
    return lastmod ? { loc, lastmod } : { loc };
  });
}

export function buildRobotsTxt(origin: string): string {
  const base = origin.trim().replace(/\/+$/, '');
  const disallow = ROBOTS_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`).join('\n');
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${base}/sitemap.xml\n`;
}
