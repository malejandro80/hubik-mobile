import { act, renderHook } from '@testing-library/react-native';
import { usePropertyRegistrationChat } from '../usePropertyRegistrationChat';
import * as chatApi from '../../services/chatApi';
import * as propertyImages from '../../services/propertyImages';

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

describe('usePropertyRegistrationChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts idle with an empty draft', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());

    expect(result.current.state.mode).toBe('idle');
    expect(result.current.state.draft).toEqual({});
  });

  it('start() enters collecting mode with a clean draft', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());

    act(() => {
      result.current.start();
    });

    expect(result.current.state.mode).toBe('collecting');
    expect(result.current.state.draft).toEqual({});
  });

  it('processMessage() merges the extracted draft and stays in collecting while fields are missing', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment' },
      missing_fields: ['price', 'city'],
      assistant_message: 'Me falta: precio y ciudad.',
      ready_to_confirm: false,
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    let outcome: any;
    await act(async () => {
      outcome = await result.current.processMessage('vendo mi piso');
    });

    expect(chatApi.intakeProperty).toHaveBeenCalledWith('vendo mi piso', {});
    expect(result.current.state.mode).toBe('collecting');
    expect(result.current.state.draft).toEqual({ operation_type: 'sale', property_type: 'Apartment' });
    expect(outcome).toEqual({
      assistantMessage: 'Me falta: precio y ciudad.',
      readyToConfirm: false,
      draft: { operation_type: 'sale', property_type: 'Apartment' },
    });
  });

  it('processMessage() moves to the photos step once nothing else is missing', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment', price: 420000, bedrooms: 3, bathrooms: 2, square_meters: 90, city: 'Madrid', address: 'Calle Mayor 12' },
      missing_fields: [],
      assistant_message: '¡Perfecto! Ya tengo todos los datos.',
      ready_to_confirm: true,
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    await act(async () => {
      await result.current.processMessage('el resto de los datos');
    });

    expect(result.current.state.mode).toBe('photos');
  });

  it('addPhotos() stages local URIs without uploading or leaving the photos step', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: {},
      missing_fields: [],
      assistant_message: 'Listo.',
      ready_to_confirm: true,
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    await act(async () => {
      await result.current.processMessage('todo listo');
    });

    act(() => {
      result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
    });

    expect(propertyImages.uploadPropertyImages).not.toHaveBeenCalled();
    expect(result.current.state.draft.images).toEqual(['file://a.jpg', 'file://b.jpg']);
    expect(result.current.state.mode).toBe('photos');
  });

  it('removePhoto() drops a staged image by index', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => {
      result.current.addPhotos(['file://a.jpg', 'file://b.jpg', 'file://c.jpg']);
    });

    act(() => result.current.removePhoto(1));

    expect(result.current.state.draft.images).toEqual(['file://a.jpg', 'file://c.jpg']);
  });

  it('movePhoto() swaps a staged image with its neighbor, e.g. to change the cover photo', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
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

  it('skipPhotos() moves from photos to the location step', async () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => {
      result.current.skipPhotos();
    });

    expect(result.current.state.mode).toBe('location');
  });

  it('editPhotos()/editLocation() jump back to those steps from confirming', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    act(() => result.current.editPhotos());
    expect(result.current.state.mode).toBe('photos');

    act(() => result.current.editLocation());
    expect(result.current.state.mode).toBe('location');
  });

  it('setLocation() stores coordinates and moves to generating_description', () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => result.current.skipPhotos());

    act(() => {
      result.current.setLocation(40.4168, -3.7038);
    });

    expect(result.current.state.draft.latitude).toBe(40.4168);
    expect(result.current.state.draft.longitude).toBe(-3.7038);
    expect(result.current.state.mode).toBe('generating_description');
  });

  it('generateDescription() merges the AI description and moves to confirming', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Piso luminoso en el centro de Madrid.',
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => result.current.skipPhotos());
    act(() => result.current.setLocation(40.4168, -3.7038));

    await act(async () => {
      await result.current.generateDescription();
    });

    expect(chatApi.generatePropertyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 40.4168, longitude: -3.7038 })
    );
    expect(result.current.state.draft.description).toBe('Piso luminoso en el centro de Madrid.');
    expect(result.current.state.mode).toBe('confirming');
  });

  it('processMessage() called from confirming (a correction) returns to confirming, not photos', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Piso luminoso en el centro de Madrid.',
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => result.current.skipPhotos());
    act(() => result.current.setLocation(40.4168, -3.7038));
    await act(async () => {
      await result.current.generateDescription();
    });
    expect(result.current.state.mode).toBe('confirming');

    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: {
        latitude: 40.4168,
        longitude: -3.7038,
        description: 'Piso luminoso en el centro de Madrid.',
        price: 450000,
      },
      missing_fields: [],
      assistant_message: 'Actualicé el precio.',
      ready_to_confirm: true,
    });

    await act(async () => {
      await result.current.processMessage('el precio es 450000');
    });

    expect(chatApi.intakeProperty).toHaveBeenCalledWith(
      'el precio es 450000',
      expect.objectContaining({ description: 'Piso luminoso en el centro de Madrid.' })
    );
    expect(result.current.state.mode).toBe('confirming');
    expect(result.current.state.draft.price).toBe(450000);
  });

  it('generateDescription() reverts to location on failure so the user can retry', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockRejectedValueOnce(new Error('gemini down'));

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    act(() => result.current.skipPhotos());
    act(() => result.current.setLocation(40.4168, -3.7038));

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.generateDescription();
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('gemini down');
    expect(result.current.state.mode).toBe('location');
  });

  it('subsequent processMessage() calls send the accumulated draft as "known"', async () => {
    (chatApi.intakeProperty as jest.Mock)
      .mockResolvedValueOnce({
        data: { operation_type: 'sale' },
        missing_fields: ['property_type'],
        assistant_message: 'Me falta: tipo de propiedad.',
        ready_to_confirm: false,
      })
      .mockResolvedValueOnce({
        data: { operation_type: 'sale', property_type: 'Apartment' },
        missing_fields: [],
        assistant_message: 'Listo.',
        ready_to_confirm: true,
      });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    await act(async () => {
      await result.current.processMessage('quiero vender');
    });
    await act(async () => {
      await result.current.processMessage('es un piso');
    });

    expect(chatApi.intakeProperty).toHaveBeenLastCalledWith('es un piso', { operation_type: 'sale' });
  });

  it('processAudioMessage() merges the transcribed draft and returns the transcript', async () => {
    (chatApi.intakePropertyAudio as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment' },
      missing_fields: ['price', 'city'],
      assistant_message: 'Me falta: precio y ciudad.',
      ready_to_confirm: false,
      transcript: 'vendo mi piso',
    });

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    const audio = { data: 'YmFzZTY0', mimeType: 'audio/mp4' };
    let outcome: any;
    await act(async () => {
      outcome = await result.current.processAudioMessage(audio);
    });

    expect(chatApi.intakePropertyAudio).toHaveBeenCalledWith(audio, {});
    expect(result.current.state.mode).toBe('collecting');
    expect(result.current.state.draft).toEqual({ operation_type: 'sale', property_type: 'Apartment' });
    expect(outcome).toEqual({
      assistantMessage: 'Me falta: precio y ciudad.',
      readyToConfirm: false,
      draft: { operation_type: 'sale', property_type: 'Apartment' },
      transcript: 'vendo mi piso',
    });
  });

  it('confirmPublish() publishes the draft and resets to idle on success', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment', price: 420000, bedrooms: 3, bathrooms: 2, square_meters: 90, city: 'Madrid', address: 'Calle Mayor 12' },
      missing_fields: [],
      assistant_message: 'Listo.',
      ready_to_confirm: true,
    });
    const mockProperty = { id: 'new-1', title: 'Piso en venta en Madrid' };
    (chatApi.publishProperty as jest.Mock).mockResolvedValueOnce(mockProperty);

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    await act(async () => {
      await result.current.processMessage('todos los datos');
    });

    let published: any;
    await act(async () => {
      published = await result.current.confirmPublish();
    });

    expect(chatApi.publishProperty).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Madrid', price: 420000 })
    );
    expect(published).toEqual(mockProperty);
    expect(result.current.state.mode).toBe('idle');
    expect(result.current.state.draft).toEqual({});
  });

  it('confirmPublish() uploads staged local photos as a single batch, preserving order', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment', price: 420000, bedrooms: 3, bathrooms: 2, square_meters: 90, city: 'Madrid', address: 'Calle Mayor 12' },
      missing_fields: [],
      assistant_message: 'Listo.',
      ready_to_confirm: true,
    });
    (propertyImages.uploadPropertyImages as jest.Mock).mockResolvedValueOnce([
      'https://storage.example.com/a.jpg',
      'https://storage.example.com/b.jpg',
    ]);
    const mockProperty = { id: 'new-1', title: 'Piso en venta en Madrid' };
    (chatApi.publishProperty as jest.Mock).mockResolvedValueOnce(mockProperty);

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    await act(async () => {
      await result.current.processMessage('todos los datos');
    });
    act(() => {
      result.current.addPhotos(['file://a.jpg', 'file://b.jpg']);
    });

    await act(async () => {
      await result.current.confirmPublish();
    });

    expect(propertyImages.uploadPropertyImages).toHaveBeenCalledWith(
      expect.any(String),
      ['file://a.jpg', 'file://b.jpg']
    );
    expect(chatApi.publishProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ['https://storage.example.com/a.jpg', 'https://storage.example.com/b.jpg'],
      })
    );
  });

  it('confirmPublish() keeps the draft intact for retry when publishing fails', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment', price: 420000, bedrooms: 3, bathrooms: 2, square_meters: 90, city: 'Madrid', address: 'Calle Mayor 12' },
      missing_fields: [],
      assistant_message: 'Listo.',
      ready_to_confirm: true,
    });
    (chatApi.publishProperty as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());
    await act(async () => {
      await result.current.processMessage('todos los datos');
    });

    await expect(
      act(async () => {
        await result.current.confirmPublish();
      })
    ).rejects.toThrow('db down');

    expect(result.current.state.mode).toBe('photos');
    expect(result.current.state.draft.city).toBe('Madrid');
  });

  it('cancel() resets the draft and mode from any state', async () => {
    const { result } = renderHook(() => usePropertyRegistrationChat());
    act(() => result.current.start());

    act(() => {
      result.current.cancel();
    });

    expect(result.current.state.mode).toBe('idle');
    expect(result.current.state.draft).toEqual({});
  });
});
