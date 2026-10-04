import { supabase } from '../../lib/supabase';
import { fetchListingPublishedAt } from '../listingPublishedAt';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

const mockQuery = (result: unknown) => {
  const maybeSingle = jest.fn().mockImplementation(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
  );
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
  return { select, eq };
};

describe('fetchListingPublishedAt', () => {
  beforeEach(() => (supabase.from as jest.Mock).mockReset());

  it('reads only the publication date of the listing from the public view', async () => {
    const { select, eq } = mockQuery({ data: { created_at: '2026-10-01T10:00:00Z' }, error: null });

    await expect(fetchListingPublishedAt(ID)).resolves.toBe('2026-10-01T10:00:00Z');
    expect(supabase.from).toHaveBeenCalledWith('property_listings');
    expect(select).toHaveBeenCalledWith('created_at');
    expect(eq).toHaveBeenCalledWith('id', ID);
  });

  it('returns null when the listing is missing, the query fails or the request throws', async () => {
    mockQuery({ data: null, error: null });
    await expect(fetchListingPublishedAt(ID)).resolves.toBeNull();
    mockQuery({ data: null, error: { message: 'boom' } });
    await expect(fetchListingPublishedAt(ID)).resolves.toBeNull();
    mockQuery(new Error('offline'));
    await expect(fetchListingPublishedAt(ID)).resolves.toBeNull();
  });
});
