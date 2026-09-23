import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SPLASH_MAX_WAIT_MS } from '../constants/splash';

export function useSplashHandoff(ready: boolean): void {
  const hiddenRef = useRef(false);

  useEffect(() => {
    const hide = () => {
      if (hiddenRef.current) return;
      hiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => undefined);
    };

    if (ready) {
      hide();
      return;
    }

    const timeout = setTimeout(hide, SPLASH_MAX_WAIT_MS);
    return () => clearTimeout(timeout);
  }, [ready]);
}
