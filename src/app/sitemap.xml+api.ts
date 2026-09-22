import { SITEMAP_CACHE_CONTROL } from '../constants/sitemap';
import { buildSitemapEntries, buildSitemapXml } from '../lib/sitemap';
import { resolveOrigin } from '../services/sharedMetadata';
import { fetchSitemapListings } from '../services/sharedProperty';

export async function GET(request: Request) {
  const origin = resolveOrigin(request.url);
  const listings = await fetchSitemapListings();
  return new Response(buildSitemapXml(buildSitemapEntries(listings, origin)), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': SITEMAP_CACHE_CONTROL },
  });
}
