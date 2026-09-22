import { buildMapHtml, buildReadOnlyMapHtml, DEFAULT_CENTER } from '../mapPicker';

describe('mapPicker library', () => {
  it('provides a valid default center coordinate', () => {
    expect(DEFAULT_CENTER.latitude).toBeCloseTo(40.4168);
    expect(DEFAULT_CENTER.longitude).toBeCloseTo(-3.7038);
  });

  it('generates an HTML string embedding the provided coordinates and Leaflet map', () => {
    const lat = 40.4168;
    const lng = -3.7038;
    const html = buildMapHtml(lat, lng);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(`setView([${lat}, ${lng}], 16)`);
    expect(html).toContain(`marker([${lat}, ${lng}]`);
    expect(html).toContain(`post(${lat}, ${lng})`);
  });

  it('generates a read-only map HTML with disabled interactions and marker', () => {
    const lat = 40.4168;
    const lng = -3.7038;
    const html = buildReadOnlyMapHtml(lat, lng, false);

    expect(html).toContain('zoomControl: false');
    expect(html).toContain('dragging: false');
    expect(html).toContain(`setView([${lat}, ${lng}], 15)`);
    expect(html).toContain(`marker([${lat}, ${lng}])`);
    expect(html).not.toContain('L.circle');
  });

  it('adds an approximate circle overlay when isApproximate is true', () => {
    const lat = 40.4168;
    const lng = -3.7038;
    const html = buildReadOnlyMapHtml(lat, lng, true);

    expect(html).toContain('L.circle');
    expect(html).toContain('radius: 300');
  });
});
