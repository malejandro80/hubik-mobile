import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePropertyRegistrationChat } from '../usePropertyRegistrationChat';
import * as chatApi from '../../services/chatApi';
import * as propertyImages from '../../services/propertyImages';
import { READY_NEEDS_MEDIA_VARIANTS, READY_TO_CONFIRM_VARIANTS } from '../../constants/intakeMessages';
import { PropertyDraft } from '../../types/property';

jest.mock('../../services/chatApi', () => ({
  intakeProperty: jest.fn(),
  intakePropertyAudio: jest.fn(),
  publishProperty: jest.fn(),
  generatePropertyDescription: jest.fn(),
}));

jest.mock('../../services/propertyImages', () => ({
  uploadPropertyImages: jest.fn(),
  MAX_PROPERTY_IMAGES: 10,
}));

const COMPLETE: PropertyDraft = {
  catastro: '9872023VH5797S0001WX',
  operation_type: 'sale',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
};

const intakeResponse = (data: PropertyDraft, overrides: Record<string, unknown> = {}) => ({
  data,
  missing_fields: [],
  assistant_message: 'ok',
  ready_to_confirm: true,
  ...overrides,
});

const intake = chatApi.intakeProperty as jest.Mock;
const intakeAudio = chatApi.intakePropertyAudio as jest.Mock;
const describe_ = chatApi.generatePropertyDescription as jest.Mock;
const publish = chatApi.publishProperty as jest.Mock;
const upload = propertyImages.uploadPropertyImages as jest.Mock;

const startComposer = () => {
  const hook = renderHook(() => usePropertyRegistrationChat());
  act(() => hook.result.current.start());
  return hook;
};

describe('usePropertyRegistrationChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    describe_.mockResolvedValue({ description: 'Descripción generada' });
  });

  describe('session lifecycle', () => {
    it('starts idle with an empty draft', () => {
      const { result } = renderHook(() => usePropertyRegistrationChat());

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.draft).toEqual({});
      expect(result.current.state.recentlyChanged).toEqual([]);
    });

    it('start() enters composing with a clean draft', () => {
      const { result } = startComposer();

      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.draft).toEqual({});
    });

    it('cancel() resets the draft from any state', () => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg']);
      });

      act(() => result.current.cancel());

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.draft).toEqual({});
    });

    it('ignores an AI response that arrives after cancel()', async () => {
      let resolveIntake!: (value: unknown) => void;
      intake.mockReturnValueOnce(new Promise((resolve) => (resolveIntake = resolve)));
      const { result } = startComposer();

      let pending!: Promise<unknown>;
      act(() => {
        pending = result.current.processMessage('vendo mi piso');
      });
      act(() => result.current.cancel());
      await act(async () => {
        resolveIntake(intakeResponse({ price: 100 }));
        await pending;
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.draft).toEqual({});
    });
  });

  describe('messages', () => {
    it('processMessage() merges the extracted draft, stays composing and marks what changed', async () => {
      intake.mockResolvedValueOnce(
        intakeResponse(
          { operation_type: 'sale', property_type: 'Apartment' },
          { missing_fields: ['price', 'city'], assistant_message: 'Me falta: precio y ciudad.', ready_to_confirm: false }
        )
      );
      const { result } = startComposer();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.processMessage('vendo mi piso');
      });

      expect(intake).toHaveBeenCalledWith('vendo mi piso', {});
      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.draft).toEqual({ operation_type: 'sale', property_type: 'Apartment' });
      expect([...result.current.state.recentlyChanged].sort()).toEqual(['operation_type', 'property_type']);
      expect(outcome).toEqual({
        assistantMessage: 'Me falta: precio y ciudad.',
        readyToConfirm: false,
        draft: { operation_type: 'sale', property_type: 'Apartment' },
      });
    });

    it('sends the accumulated draft as "known" on later messages', async () => {
      intake
        .mockResolvedValueOnce(intakeResponse({ operation_type: 'sale' }, { ready_to_confirm: false }))
        .mockResolvedValueOnce(intakeResponse({ operation_type: 'sale', property_type: 'Apartment' }));
      const { result } = startComposer();

      await act(async () => {
        await result.current.processMessage('quiero vender');
      });
      await act(async () => {
        await result.current.processMessage('es un piso');
      });

      expect(intake).toHaveBeenLastCalledWith('es un piso', { operation_type: 'sale' });
    });

    it('processAudioMessage() merges the transcribed draft and returns the transcript', async () => {
      intakeAudio.mockResolvedValueOnce({
        ...intakeResponse({ operation_type: 'sale', property_type: 'Apartment' }, { ready_to_confirm: false }),
        assistant_message: 'Me falta: precio y ciudad.',
        transcript: 'vendo mi piso',
      });
      const { result } = startComposer();
      const audio = { data: 'YmFzZTY0', mimeType: 'audio/mp4' };

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.processAudioMessage(audio);
      });

      expect(intakeAudio).toHaveBeenCalledWith(audio, {});
      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.draft).toEqual({ operation_type: 'sale', property_type: 'Apartment' });
      expect(outcome).toEqual({
        assistantMessage: 'Me falta: precio y ciudad.',
        readyToConfirm: false,
        draft: { operation_type: 'sale', property_type: 'Apartment' },
        transcript: 'vendo mi piso',
      });
    });

    it('correcting a field changes only that field and never restarts a step', async () => {
      intake
        .mockResolvedValueOnce(intakeResponse(COMPLETE))
        .mockResolvedValueOnce(intakeResponse({ ...COMPLETE, price: 175000 }));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      await waitFor(() => expect(result.current.state.draft.description).toBe('Descripción generada'));
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
      });
      act(() => result.current.setLocation(39.47, -0.37));

      await act(async () => {
        await result.current.processMessage('el precio es 175 mil');
      });

      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.recentlyChanged).toEqual(['price']);
      expect(result.current.state.draft).toEqual({
        ...COMPLETE,
        price: 175000,
        images: ['file://a.jpg', 'file://b.jpg'],
        latitude: 39.47,
        longitude: -0.37,
        description: 'Descripción generada',
      });
    });

    it('keeps photos and the pin added while the AI is still answering', async () => {
      let resolveIntake!: (value: unknown) => void;
      intake.mockReturnValueOnce(new Promise((resolve) => (resolveIntake = resolve)));
      const { result } = startComposer();

      let pending!: Promise<unknown>;
      act(() => {
        pending = result.current.processMessage('piso en Madrid');
      });
      act(() => {
        result.current.addPhotos(['file://a.jpg']);
      });
      act(() => result.current.setLocation(40.4, -3.7));
      await act(async () => {
        resolveIntake(intakeResponse({ city: 'Madrid' }, { ready_to_confirm: false }));
        await pending;
      });

      expect(result.current.state.draft).toEqual({
        city: 'Madrid',
        images: ['file://a.jpg'],
        latitude: 40.4,
        longitude: -3.7,
      });
    });

    it('replaces the "ready to confirm" message with a media prompt when there are no photos and no pin', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE, { assistant_message: READY_TO_CONFIRM_VARIANTS[0] }));
      const { result } = startComposer();

      let outcome: any;
      await act(async () => {
        outcome = await result.current.processMessage('todos los datos');
      });

      expect(outcome.readyToConfirm).toBe(true);
      expect(outcome.assistantMessage).not.toBe(READY_TO_CONFIRM_VARIANTS[0]);
      expect(READY_NEEDS_MEDIA_VARIANTS).toContain(outcome.assistantMessage);
    });

    it('preserves a message prefix (e.g. the catastro-verified note) when swapping in the media prompt', async () => {
      const prefix = '✅ Referencia catastral verificada: no está duplicada.\n\n';
      intake.mockResolvedValueOnce(
        intakeResponse(COMPLETE, { assistant_message: `${prefix}${READY_TO_CONFIRM_VARIANTS[2]}` })
      );
      const { result } = startComposer();

      let outcome: any;
      await act(async () => {
        outcome = await result.current.processMessage('todos los datos');
      });

      expect(outcome.assistantMessage.startsWith(prefix)).toBe(true);
      expect(READY_NEEDS_MEDIA_VARIANTS).toContain(outcome.assistantMessage.slice(prefix.length));
    });

    it('keeps the "ready to confirm" message unchanged once a photo has already been added', async () => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg']);
      });
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE, { assistant_message: READY_TO_CONFIRM_VARIANTS[1] }));

      let outcome: any;
      await act(async () => {
        outcome = await result.current.processMessage('todos los datos');
      });

      expect(outcome.assistantMessage).toBe(READY_TO_CONFIRM_VARIANTS[1]);
    });

    it('keeps the "ready to confirm" message unchanged once a pin has already been set', async () => {
      const { result } = startComposer();
      act(() => result.current.setLocation(40.4, -3.7));
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE, { assistant_message: READY_TO_CONFIRM_VARIANTS[1] }));

      let outcome: any;
      await act(async () => {
        outcome = await result.current.processMessage('todos los datos');
      });

      expect(outcome.assistantMessage).toBe(READY_TO_CONFIRM_VARIANTS[1]);
    });
  });

  describe('direct edits', () => {
    it('updateField() applies a valid value and clears the "new" marker for that field', async () => {
      intake.mockResolvedValueOnce(intakeResponse({ price: 100, city: 'Madrid' }, { ready_to_confirm: false }));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('piso en Madrid a 100');
      });

      let outcome: unknown;
      act(() => {
        outcome = result.current.updateField('price', '175.000');
      });

      expect(outcome).toEqual({ ok: true, value: 175000 });
      expect(result.current.state.draft).toEqual({ price: 175000, city: 'Madrid' });
      expect(result.current.state.recentlyChanged).toEqual(['city']);
    });

    it('updateField() rejects an invalid value and leaves the draft untouched', () => {
      const { result } = startComposer();
      act(() => {
        result.current.updateField('city', 'Madrid');
      });

      let outcome: unknown;
      act(() => {
        outcome = result.current.updateField('price', '-5');
      });

      expect(outcome).toEqual({ ok: false, error: 'out_of_range' });
      expect(result.current.state.draft).toEqual({ city: 'Madrid' });
    });

    it('updateAmenities() replaces the amenities list', () => {
      const { result } = startComposer();

      act(() => result.current.updateAmenities(['piscina', 'garaje']));

      expect(result.current.state.draft.amenities).toEqual(['piscina', 'garaje']);
    });
  });

  describe('attachments', () => {
    it('addPhotos() stages local URIs without uploading', () => {
      const { result } = startComposer();

      let outcome: { images: string[]; added: number } | undefined;
      act(() => {
        outcome = result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
      });

      expect(upload).not.toHaveBeenCalled();
      expect(result.current.state.draft.images).toEqual(['file://a.jpg', 'file://b.jpg']);
      expect(outcome).toEqual({ images: ['file://a.jpg', 'file://b.jpg'], added: 2 });
    });

    it('addPhotos() keeps at most 10 photos and reports how many were added', () => {
      const { result } = startComposer();
      const eight = Array.from({ length: 8 }, (_, i) => `file://${i}.jpg`);
      act(() => {
        result.current.addPhotos(eight);
      });

      let outcome: { images: string[]; added: number } | undefined;
      act(() => {
        outcome = result.current.addPhotos(['file://x.jpg', 'file://y.jpg', 'file://z.jpg']);
      });

      expect(result.current.state.draft.images).toHaveLength(10);
      expect(outcome?.added).toBe(2);
    });

    it('removePhoto() drops a staged image by index', () => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg', 'file://c.jpg']);
      });

      act(() => result.current.removePhoto(1));

      expect(result.current.state.draft.images).toEqual(['file://a.jpg', 'file://c.jpg']);
    });

    it('movePhoto() swaps a staged image with its neighbor, e.g. to change the cover photo', () => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg', 'file://c.jpg']);
      });

      act(() => result.current.movePhoto(1, 'up'));
      expect(result.current.state.draft.images).toEqual(['file://b.jpg', 'file://a.jpg', 'file://c.jpg']);

      act(() => result.current.movePhoto(0, 'up'));
      expect(result.current.state.draft.images).toEqual(['file://b.jpg', 'file://a.jpg', 'file://c.jpg']);

      act(() => result.current.movePhoto(2, 'down'));
      expect(result.current.state.draft.images).toEqual(['file://b.jpg', 'file://a.jpg', 'file://c.jpg']);
    });

    it('setPhotos() applies a new order of the same photos and changes nothing else', () => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg', 'file://c.jpg']);
      });
      act(() => result.current.setLocation(39.47, -0.37));

      act(() => result.current.setPhotos(['file://c.jpg', 'file://a.jpg', 'file://b.jpg']));

      expect(result.current.state.draft).toEqual({
        images: ['file://c.jpg', 'file://a.jpg', 'file://b.jpg'],
        latitude: 39.47,
        longitude: -0.37,
      });
    });

    it.each([
      ['an added photo', ['file://a.jpg', 'file://b.jpg', 'file://x.jpg']],
      ['a removed photo', ['file://a.jpg']],
      ['a duplicated photo', ['file://a.jpg', 'file://a.jpg']],
      ['a replaced photo', ['file://a.jpg', 'file://x.jpg']],
    ])('setPhotos() ignores %s', (_label, proposed) => {
      const { result } = startComposer();
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
      });

      act(() => result.current.setPhotos(proposed));

      expect(result.current.state.draft.images).toEqual(['file://a.jpg', 'file://b.jpg']);
    });

    it('setLocation() only stores the coordinates: no phase change and no description request', () => {
      const { result } = startComposer();

      act(() => result.current.setLocation(39.47, -0.37));

      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.draft).toEqual({ latitude: 39.47, longitude: -0.37 });
      expect(describe_).not.toHaveBeenCalled();
    });

    it('clearLocation() removes the pin', () => {
      const { result } = startComposer();
      act(() => result.current.setLocation(39.47, -0.37));

      act(() => result.current.clearLocation());

      expect(result.current.state.draft.latitude).toBeUndefined();
      expect(result.current.state.draft.longitude).toBeUndefined();
    });
  });

  describe('description', () => {
    it('is generated once automatically when the required fields first become complete', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      const { result } = startComposer();

      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      await waitFor(() => expect(result.current.state.draft.description).toBe('Descripción generada'));

      expect(describe_).toHaveBeenCalledTimes(1);
      expect(result.current.state.describing).toBe(false);
      expect(result.current.state.describedFrom).not.toBeNull();
    });

    it('is also generated when an inline edit completes the last missing field', async () => {
      const { catastro, ...withoutCatastro } = COMPLETE;
      intake.mockResolvedValueOnce(intakeResponse(withoutCatastro, { ready_to_confirm: false }));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('casi todos los datos');
      });
      expect(describe_).not.toHaveBeenCalled();

      act(() => {
        result.current.updateField('catastro', catastro as string);
      });
      await waitFor(() => expect(result.current.state.draft.description).toBe('Descripción generada'));

      expect(describe_).toHaveBeenCalledTimes(1);
    });

    it('is not regenerated automatically after a later correction', async () => {
      intake
        .mockResolvedValueOnce(intakeResponse(COMPLETE))
        .mockResolvedValueOnce(intakeResponse({ ...COMPLETE, price: 100 }));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      await waitFor(() => expect(result.current.state.draft.description).toBe('Descripción generada'));

      await act(async () => {
        await result.current.processMessage('el precio es 100');
      });
      await act(async () => undefined);

      expect(describe_).toHaveBeenCalledTimes(1);
    });

    it('does not retry by itself when generation fails, and can be retried manually', async () => {
      describe_.mockRejectedValueOnce(new Error('gemini down'));
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      await waitFor(() => expect(result.current.state.descriptionFailed).toBe(true));
      await act(async () => undefined);

      expect(describe_).toHaveBeenCalledTimes(1);
      expect(result.current.state.draft.description).toBeUndefined();

      await act(async () => {
        await result.current.requestDescription();
      });

      expect(describe_).toHaveBeenCalledTimes(2);
      expect(result.current.state.draft.description).toBe('Descripción generada');
      expect(result.current.state.descriptionFailed).toBe(false);
    });

    it('requestDescription() regenerates on demand and records what it was based on', async () => {
      const { result } = startComposer();
      act(() => {
        result.current.updateField('price', '100');
      });
      describe_.mockResolvedValueOnce({ description: 'Otra descripción' });

      await act(async () => {
        await result.current.requestDescription();
      });

      expect(result.current.state.draft.description).toBe('Otra descripción');
      expect(result.current.state.describedFrom).not.toBeNull();
    });
  });

  describe('publish', () => {
    it('confirmPublish() publishes the draft and resets to idle on success', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      const property = { id: 'new-1', title: 'Piso en venta en Madrid' };
      publish.mockResolvedValueOnce(property);
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });

      let published: unknown;
      await act(async () => {
        published = await result.current.confirmPublish();
      });

      expect(publish).toHaveBeenCalledWith(expect.objectContaining({ city: 'Madrid', price: 420000 }));
      expect(published).toEqual(property);
      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.draft).toEqual({});
    });

    it('keeps the chosen landlord outside the draft and publishes with its id, then forgets it', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      publish.mockResolvedValueOnce({ id: 'new-1', title: 'Piso en venta en Madrid' });
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      const ana = { userId: 'c1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' };

      act(() => result.current.setLandlord(ana));
      expect(result.current.state.landlord).toEqual(ana);
      expect(result.current.state.draft).not.toHaveProperty('landlord');

      await act(async () => {
        await result.current.confirmPublish();
      });

      expect(publish).toHaveBeenCalledWith(expect.objectContaining({ city: 'Madrid' }), 'c1');
      expect(result.current.state.landlord).toBeNull();
    });

    it('lets the landlord be removed before publishing', () => {
      const { result } = startComposer();

      act(() => result.current.setLandlord({ userId: 'c1', displayName: 'Ana', maskedEmail: 'a***@gmail.com' }));
      act(() => result.current.setLandlord(null));

      expect(result.current.state.landlord).toBeNull();
    });

    it('confirmPublish() uploads staged local photos as a single batch, preserving order', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      upload.mockResolvedValueOnce(['https://storage.example.com/a.jpg', 'https://storage.example.com/b.jpg']);
      publish.mockResolvedValueOnce({ id: 'new-1', title: 'Piso en venta en Madrid' });
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });
      act(() => {
        result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
      });

      await act(async () => {
        await result.current.confirmPublish();
      });

      expect(upload).toHaveBeenCalledWith(expect.any(String), ['file://a.jpg', 'file://b.jpg']);
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['https://storage.example.com/a.jpg', 'https://storage.example.com/b.jpg'],
        })
      );
    });

    it('confirmPublish() keeps the draft intact for retry when publishing fails', async () => {
      intake.mockResolvedValueOnce(intakeResponse(COMPLETE));
      publish.mockRejectedValueOnce(new Error('db down'));
      const { result } = startComposer();
      await act(async () => {
        await result.current.processMessage('todos los datos');
      });

      await expect(
        act(async () => {
          await result.current.confirmPublish();
        })
      ).rejects.toThrow('db down');

      expect(result.current.state.phase).toBe('composing');
      expect(result.current.state.draft.city).toBe('Madrid');
    });
  });
});
