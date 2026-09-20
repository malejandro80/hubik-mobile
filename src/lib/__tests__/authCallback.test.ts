import { extractAuthCode } from '../authCallback';

describe('extractAuthCode', () => {
  it('reads the code from a custom-scheme callback url', () => {
    expect(extractAuthCode('hubikmobile://auth/callback?code=abc123')).toBe('abc123');
  });

  it('reads the code when other params come first and decodes it', () => {
    expect(extractAuthCode('hubikmobile://auth/callback?state=x&code=a%2Bb')).toBe('a+b');
  });

  it('ignores a trailing fragment', () => {
    expect(extractAuthCode('hubikmobile://auth/callback?code=abc#frag')).toBe('abc');
  });

  it('returns null when the callback carries an error instead of a code', () => {
    expect(
      extractAuthCode('hubikmobile://auth/callback?error=access_denied&error_description=nope')
    ).toBeNull();
  });

  it('returns null for urls from another scheme', () => {
    expect(extractAuthCode('https://evil.example/auth/callback?code=abc')).toBeNull();
  });

  it('returns null for empty or malformed input', () => {
    expect(extractAuthCode('')).toBeNull();
    expect(extractAuthCode('not a url')).toBeNull();
  });
});
