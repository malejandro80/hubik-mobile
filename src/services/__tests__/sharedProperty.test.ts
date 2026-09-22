import { supabase } from '../../lib/supabase';
import {
  fetchSharedProperty,
  fetchSharedPropertyByRef,
  fetchSitemapListings,
  SHARED_PROPERTY_COLUMNS,
} from '../sharedProperty';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

const mockQuery = (result: { data: unknown; error: unknown }) => {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
  return { select, eq, maybeSingle };
};

describe('fetchSharedProperty', () => {
  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  it('reads one listing from the public view by id and returns it', async () => {
    const row = { id: ID, title: 'Piso en Madrid', price: 200000 };
    const { select, eq } = mockQuery({ data: row, error: null });

    await expect(fetchSharedProperty(ID)).resolves.toEqual(row);

    expect(supabase.from).toHaveBeenCalledWith('property_listings');
    expect(select).toHaveBeenCalledWith(SHARED_PROPERTY_COLUMNS);
    expect(eq).toHaveBeenCalledWith('id', ID);
  });

  it('selects only display columns, never coordinates, the creator id or the embedding', () => {
    const columns = SHARED_PROPERTY_COLUMNS.split(',').map((column) => column.trim());

    expect(columns).toEqual(
      expect.arrayContaining(['id', 'title', 'price', 'city', 'address', 'description', 'images', 'agency_name', 'agent_name'])
    );
    ['embedding', 'created_by', 'latitude', 'longitude', 'agency_id', '*'].forEach((forbidden) => {
      expect(columns).not.toContain(forbidden);
    });
  });

  it('returns null when the listing does not exist', async () => {
    mockQuery({ data: null, error: null });

    await expect(fetchSharedProperty(ID)).resolves.toBeNull();
  });

  it('throws when the database fails', async () => {
    mockQuery({ data: null, error: new Error('offline') });

    await expect(fetchSharedProperty(ID)).rejects.toThrow('offline');
  });

  it.each(['', 'draft-preview', "1' or '1'='1", 'undefined'])('does not query for %p', async (id) => {
    await expect(fetchSharedProperty(id)).resolves.toBeNull();

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('fetchSharedPropertyByRef', () => {
  const SHORT = '6ff52f65';
  const FULL = '6ff52f65-00be-4ee2-a304-302a60358d4e';
  const OTHER = '6ff52f65-ffff-4ee2-a304-302a60358d99';

  const mockRangeQuery = (rows: unknown) => {
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const lte = jest.fn(() => ({ limit }));
    const gte = jest.fn(() => ({ lte }));
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });
    return { select, gte, lte, limit };
  };

  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  it('looks a full id up directly', async () => {
    const row = { id: FULL, title: 'Piso' };
    const { eq } = mockQuery({ data: row, error: null });

    await expect(fetchSharedPropertyByRef({ kind: 'id', id: FULL })).resolves.toEqual(row);

    expect(eq).toHaveBeenCalledWith('id', FULL);
  });

  it('resolves a short id by the id range and returns the only match, even if the title changed', async () => {
    const row = { id: FULL, title: 'Piso reformado' };
    const { select, gte, lte, limit } = mockRangeQuery([row]);

    await expect(fetchSharedPropertyByRef({ kind: 'slug', slug: 'piso-antiguo-6ff52f65', shortId: SHORT })).resolves.toEqual(row);

    expect(select).toHaveBeenCalledWith(SHARED_PROPERTY_COLUMNS);
    expect(gte).toHaveBeenCalledWith('id', '6ff52f65-0000-0000-0000-000000000000');
    expect(lte).toHaveBeenCalledWith('id', '6ff52f65-ffff-ffff-ffff-ffffffffffff');
    expect(limit).toHaveBeenCalledWith(2);
  });

  it('tells two listings with the same prefix apart by the full slug', async () => {
    const wanted = { id: OTHER, title: 'Casa en Valencia' };
    mockRangeQuery([{ id: FULL, title: 'Piso en Madrid' }, wanted]);

    await expect(
      fetchSharedPropertyByRef({ kind: 'slug', slug: 'casa-en-valencia-6ff52f65', shortId: SHORT })
    ).resolves.toEqual(wanted);
  });

  it('returns null when a collision cannot be resolved by the slug', async () => {
    mockRangeQuery([{ id: FULL, title: 'Piso en Madrid' }, { id: OTHER, title: 'Casa en Valencia' }]);

    await expect(
      fetchSharedPropertyByRef({ kind: 'slug', slug: 'algo-distinto-6ff52f65', shortId: SHORT })
    ).resolves.toBeNull();
  });

  it('returns null when nothing matches and throws when the database fails', async () => {
    mockRangeQuery([]);
    await expect(fetchSharedPropertyByRef({ kind: 'slug', slug: 'x-6ff52f65', shortId: SHORT })).resolves.toBeNull();

    const limit = jest.fn().mockResolvedValue({ data: null, error: new Error('offline') });
    (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ gte: () => ({ lte: () => ({ limit }) }) }) });
    await expect(fetchSharedPropertyByRef({ kind: 'slug', slug: 'x-6ff52f65', shortId: SHORT })).rejects.toThrow('offline');
  });

  it('never queries with a short id that is not eight hex characters', async () => {
    await expect(
      fetchSharedPropertyByRef({ kind: 'slug', slug: "x-1' or '1", shortId: "1' or '1" })
    ).resolves.toBeNull();

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('fetchSitemapListings', () => {
  it('reads only what a sitemap needs, for available listings, newest first, capped', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: 'a', title: 'A', created_at: '2026-09-21' }], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    await expect(fetchSitemapListings()).resolves.toEqual([{ id: 'a', title: 'A', created_at: '2026-09-21' }]);

    expect(supabase.from).toHaveBeenCalledWith('property_listings');
    expect(select).toHaveBeenCalledWith('id, title, created_at');
    expect(eq).toHaveBeenCalledWith('status', 'Available');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(5000);
  });

  it('throws when the database fails', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: new Error('offline') });
    (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ order: () => ({ limit }) }) }) });

    await expect(fetchSitemapListings()).rejects.toThrow('offline');
  });
});

