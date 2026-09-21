import { getAvatarUrl, getInitials } from '../userDisplay';

describe('getInitials', () => {
  it('uses the first letter of the first two words, uppercased', () => {
    expect(getInitials('miguel alejandro')).toBe('MA');
    expect(getInitials('Ana María Pérez')).toBe('AM');
  });

  it('handles a single word and extra whitespace', () => {
    expect(getInitials('Ana')).toBe('A');
    expect(getInitials('  ana   pérez  ')).toBe('AP');
  });

  it('returns an empty string when there is no usable name', () => {
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});

describe('getAvatarUrl', () => {
  it('returns an https avatar_url', () => {
    expect(getAvatarUrl({ avatar_url: 'https://lh3.googleusercontent.com/a/photo' })).toBe(
      'https://lh3.googleusercontent.com/a/photo'
    );
  });

  it('falls back to picture when avatar_url is missing', () => {
    expect(getAvatarUrl({ picture: 'https://example.com/me.png' })).toBe('https://example.com/me.png');
  });

  it('prefers avatar_url over picture', () => {
    expect(getAvatarUrl({ avatar_url: 'https://a.test/1.png', picture: 'https://b.test/2.png' })).toBe(
      'https://a.test/1.png'
    );
  });

  it('skips an unsafe avatar_url and uses a safe picture', () => {
    expect(getAvatarUrl({ avatar_url: 'http://a.test/1.png', picture: 'https://b.test/2.png' })).toBe(
      'https://b.test/2.png'
    );
  });

  it('rejects non-https and non-string values', () => {
    expect(getAvatarUrl({ avatar_url: 'http://insecure.test/a.png' })).toBeNull();
    expect(getAvatarUrl({ avatar_url: 'javascript:alert(1)' })).toBeNull();
    expect(getAvatarUrl({ avatar_url: 'data:image/png;base64,AAAA' })).toBeNull();
    expect(getAvatarUrl({ avatar_url: 42 })).toBeNull();
    expect(getAvatarUrl({ avatar_url: '' })).toBeNull();
  });

  it('returns null when metadata is missing or not an object', () => {
    expect(getAvatarUrl(undefined)).toBeNull();
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl('https://a.test/1.png')).toBeNull();
    expect(getAvatarUrl({})).toBeNull();
  });
});
