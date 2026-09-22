import { resolveStoreUrl } from '../storeLinks';

const IOS = 'https://apps.apple.com/app/hubik/id1';
const ANDROID = 'https://play.google.com/store/apps/details?id=com.hubik.mobile';

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';

describe('resolveStoreUrl', () => {
  it('picks the App Store on iPhone and iPad', () => {
    expect(resolveStoreUrl(IPHONE_UA, IOS, ANDROID)).toBe(IOS);
    expect(resolveStoreUrl(IPAD_UA, IOS, ANDROID)).toBe(IOS);
  });

  it('picks Google Play on Android', () => {
    expect(resolveStoreUrl(ANDROID_UA, IOS, ANDROID)).toBe(ANDROID);
  });

  it('falls back to the first configured link on desktop or unknown devices', () => {
    expect(resolveStoreUrl(DESKTOP_UA, IOS, ANDROID)).toBe(IOS);
    expect(resolveStoreUrl(DESKTOP_UA, '', ANDROID)).toBe(ANDROID);
    expect(resolveStoreUrl('', IOS, ANDROID)).toBe(IOS);
  });

  it('gives nothing when the matching platform has no link, rather than sending someone to the wrong store', () => {
    expect(resolveStoreUrl(IPHONE_UA, '', ANDROID)).toBeNull();
    expect(resolveStoreUrl(ANDROID_UA, IOS, '')).toBeNull();
  });

  it('gives nothing when no link is configured', () => {
    expect(resolveStoreUrl(IPHONE_UA, '', '')).toBeNull();
    expect(resolveStoreUrl(DESKTOP_UA, '', '')).toBeNull();
  });

  it('never returns a link that is not https', () => {
    expect(resolveStoreUrl(IPHONE_UA, 'http://apps.apple.com/x', ANDROID)).toBeNull();
    expect(resolveStoreUrl(ANDROID_UA, IOS, 'javascript:alert(1)')).toBeNull();
    expect(resolveStoreUrl(DESKTOP_UA, 'itms-apps://x', ANDROID)).toBe(ANDROID);
  });

  it('ignores surrounding spaces in configured links', () => {
    expect(resolveStoreUrl(IPHONE_UA, `  ${IOS}  `, '')).toBe(IOS);
  });
});
