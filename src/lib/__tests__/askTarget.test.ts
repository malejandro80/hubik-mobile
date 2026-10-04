import { resolveAskTarget } from '../askTarget';

const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

describe('resolveAskTarget', () => {
  it('asks about a published listing by its id', () => {
    expect(resolveAskTarget({ id: LISTING_ID })).toEqual({ kind: 'listing', id: LISTING_ID });
  });

  it('asks about a listing opened from an opaque link by its token', () => {
    expect(resolveAskTarget({ id: TOKEN, shared: '1' })).toEqual({ kind: 'shared', token: TOKEN });
  });

  it('has nothing to ask about for a draft preview or an unknown id', () => {
    expect(resolveAskTarget({ id: 'draft-preview', preview: '1' })).toBeNull();
    expect(resolveAskTarget({ id: LISTING_ID, preview: '1' })).toBeNull();
    expect(resolveAskTarget({ id: 'prop-1' })).toBeNull();
    expect(resolveAskTarget({ id: LISTING_ID, shared: '1' })).toBeNull();
    expect(resolveAskTarget({})).toBeNull();
  });
});
