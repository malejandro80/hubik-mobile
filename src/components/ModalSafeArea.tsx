import React from 'react';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { EMPTY_SAFE_AREA_METRICS } from '../constants/safeArea';

export const ModalSafeArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics ?? EMPTY_SAFE_AREA_METRICS}>{children}</SafeAreaProvider>
);
