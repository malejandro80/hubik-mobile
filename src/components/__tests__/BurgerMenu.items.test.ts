import { getMenuItems } from '../BurgerMenu.items';
import { getCapabilities } from '../../lib/roles';

const keysFor = (role: Parameters<typeof getCapabilities>[0], status: Parameters<typeof getMenuItems>[1]) =>
  getMenuItems(getCapabilities(role), status).map((item) => item.key);

describe('getMenuItems', () => {
  it('offers sign in and no register entry when signed out', () => {
    const keys = keysFor(null, 'signedOut');
    expect(keys).toContain('sign_in');
    expect(keys).not.toContain('register');
    expect(keys).not.toContain('sign_out');
    expect(keys).toEqual(expect.arrayContaining(['search', 'new_chat', 'saved', 'settings', 'help']));
  });

  it('shows neither sign in nor sign out while loading', () => {
    const keys = keysFor(null, 'loading');
    expect(keys).not.toContain('sign_in');
    expect(keys).not.toContain('sign_out');
    expect(keys).not.toContain('register');
  });

  it('offers a client the create-agency entry and sign out, but no register entry', () => {
    const keys = keysFor('client', 'signedIn');
    expect(keys).toContain('create_agency');
    expect(keys).toContain('sign_out');
    expect(keys).not.toContain('register');
    expect(keys).not.toContain('my_agency');
    expect(keys).not.toContain('sign_in');
  });

  it('offers an agent the register entry and sign out', () => {
    const keys = keysFor('agent', 'signedIn');
    expect(keys).toContain('register');
    expect(keys).toContain('sign_out');
    expect(keys).not.toContain('create_agency');
    expect(keys).not.toContain('my_agency');
  });

  it('offers an owner the my-agency entry and no register entry', () => {
    const keys = keysFor('owner', 'signedIn');
    expect(keys).toContain('my_agency');
    expect(keys).toContain('sign_out');
    expect(keys).not.toContain('register');
    expect(keys).not.toContain('create_agency');
  });

  it('returns items with unique keys, titles and icons', () => {
    const items = getMenuItems(getCapabilities('agent'), 'signedIn');
    const keys = items.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    items.forEach((item) => {
      expect(item.title).toBeTruthy();
      expect(item.icon).toBeTruthy();
    });
  });
});
