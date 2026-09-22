import { buildRobotsTxt, buildSitemapEntries, buildSitemapXml, escapeXml } from '../sitemap';

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });

  it('leaves normal text alone', () => {
    expect(escapeXml('https://hubik.app/p/piso-6ff52f65')).toBe('https://hubik.app/p/piso-6ff52f65');
  });
});

describe('buildSitemapXml', () => {
  it('lists each address with its last modification date', () => {
    const xml = buildSitemapXml([
      { loc: 'https://h.app/p/a-11111111', lastmod: '2026-09-21' },
      { loc: 'https://h.app/p/b-22222222' },
    ]);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<url><loc>https://h.app/p/a-11111111</loc><lastmod>2026-09-21</lastmod></url>');
    expect(xml).toContain('<url><loc>https://h.app/p/b-22222222</loc></url>');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });

  it('is a valid empty sitemap when there are no listings', () => {
    const xml = buildSitemapXml([]);

    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<url>');
  });

  it('escapes anything that could break out of the XML', () => {
    const xml = buildSitemapXml([{ loc: 'https://h.app/p/x?a=1&b=2</loc><evil/>' }]);

    expect(xml).not.toContain('<evil/>');
    expect(xml).toContain('&amp;b=2&lt;/loc&gt;&lt;evil/&gt;');
  });
});

describe('buildSitemapEntries', () => {
  const LISTINGS = [
    { id: '6ff52f65-00be-4ee2-a304-302a60358d4e', title: 'Piso en venta en Madrid', created_at: '2026-09-21T10:15:00+00:00' },
    { id: '15ecaff2-f54c-4584-aee5-b7f953409f94', title: 'Casa en Valencia', created_at: 'not a date' },
  ];

  it('builds the slug address and a date-only lastmod for each listing', () => {
    const entries = buildSitemapEntries(LISTINGS, 'https://hubik.example.app/');

    expect(entries[0]).toEqual({
      loc: 'https://hubik.example.app/p/piso-en-venta-en-madrid-6ff52f65',
      lastmod: '2026-09-21',
    });
  });

  it('leaves lastmod out when the date is unusable', () => {
    expect(buildSitemapEntries(LISTINGS, 'https://hubik.example.app')[1]).toEqual({
      loc: 'https://hubik.example.app/p/casa-en-valencia-15ecaff2',
    });
  });
});

describe('buildRobotsTxt', () => {
  it('allows crawling, keeps app screens out and names the sitemap', () => {
    const text = buildRobotsTxt('https://hubik.example.app/');

    expect(text).toContain('User-agent: *');
    expect(text).toContain('Allow: /');
    ['/agency', '/sign-in', '/create-agency', '/property/'].forEach((path) => {
      expect(text).toContain(`Disallow: ${path}`);
    });
    expect(text).toContain('Sitemap: https://hubik.example.app/sitemap.xml');
  });
});
