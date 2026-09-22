import { uploadPropertyImages, MAX_PROPERTY_IMAGES } from '../propertyImages';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

const originalFetch = global.fetch;

describe('propertyImages - uploadPropertyImages', () => {
  let uploadMock: jest.Mock;
  let getPublicUrlMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    uploadMock = jest.fn().mockResolvedValue({ data: { path: 'drafts/draft-1/0.jpg' }, error: null });
    getPublicUrlMock = jest.fn().mockImplementation((path: string) => ({
      data: { publicUrl: `https://storage.example.com/${path}` },
    }));
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    });
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue({
        size: 123,
        type: '',
        slice: jest.fn((_start: number, _end: number, type: string) => ({ size: 123, type })),
      }),
    }) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('uploads each picked image and returns its public URL', async () => {
    const urls = await uploadPropertyImages('draft-1', ['file://a.jpg', 'file://b.jpg']);

    expect(supabase.storage.from).toHaveBeenCalledWith('property-images');
    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(urls).toHaveLength(2);
    urls.forEach((url) => expect(url).toMatch(/^https:\/\/storage\.example\.com\/drafts\/draft-1\//));
  });

  it('uploads the file as image/jpeg, not with the empty type a picked file arrives with, so storage and link previews see an image', async () => {
    await uploadPropertyImages('draft-1', ['file://a.jpg']);

    const [, uploaded, options] = uploadMock.mock.calls[0];
    expect(uploaded.type).toBe('image/jpeg');
    expect(uploaded.size).toBe(123);
    expect(options).toEqual(expect.objectContaining({ contentType: 'image/jpeg' }));
  });

  it('uploads under a path scoped to the given draft id', async () => {
    await uploadPropertyImages('draft-42', ['file://a.jpg']);

    const [path] = uploadMock.mock.calls[0];
    expect(path).toContain('drafts/draft-42/');
  });

  it('throws if more than the maximum allowed images are given', async () => {
    const uris = Array.from({ length: MAX_PROPERTY_IMAGES + 1 }, (_, i) => `file://${i}.jpg`);
    await expect(uploadPropertyImages('draft-1', uris)).rejects.toThrow(/10/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('throws a descriptive error when a file fails to upload', async () => {
    uploadMock.mockResolvedValueOnce({ data: null, error: { message: 'network error' } });

    await expect(uploadPropertyImages('draft-1', ['file://a.jpg'])).rejects.toThrow(/network error/);
  });
});
