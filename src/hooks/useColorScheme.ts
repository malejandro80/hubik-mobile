import { useSyncExternalStore } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

const subscribeNever = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useColorScheme(): 'light' | 'dark' {
  const scheme = useNativeColorScheme();
  const isClient = useSyncExternalStore(subscribeNever, getClientSnapshot, getServerSnapshot);
  return isClient && scheme === 'dark' ? 'dark' : 'light';
}
