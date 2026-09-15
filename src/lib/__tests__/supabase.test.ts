import * as SecureStore from 'expo-secure-store';
import { ExpoSecureStoreAdapter, supabase } from '../supabase';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Supabase Client & Storage Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ExpoSecureStoreAdapter', () => {
    it('calls SecureStore.getItemAsync when getting item', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('test-token');
      const result = await ExpoSecureStoreAdapter.getItem('auth_token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
      expect(result).toBe('test-token');
    });

    it('calls SecureStore.setItemAsync when setting item', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
      await ExpoSecureStoreAdapter.setItem('auth_token', 'val123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'val123');
    });

    it('calls SecureStore.deleteItemAsync when removing item', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
      await ExpoSecureStoreAdapter.removeItem('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('supabase client instance', () => {
    it('is defined and has auth namespace', () => {
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.signUp).toBe('function');
      expect(typeof supabase.from).toBe('function');
    });
  });
});
