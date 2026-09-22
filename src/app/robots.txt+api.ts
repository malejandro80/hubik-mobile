import { SITEMAP_CACHE_CONTROL } from '../constants/sitemap';
import { buildRobotsTxt } from '../lib/sitemap';
import { resolveOrigin } from '../services/sharedMetadata';

export function GET(request: Request) {
  return new Response(buildRobotsTxt(resolveOrigin(request.url)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': SITEMAP_CACHE_CONTROL },
  });
}
