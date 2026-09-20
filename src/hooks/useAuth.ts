import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import { AuthState } from '../types/auth';

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
