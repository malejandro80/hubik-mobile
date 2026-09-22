import { useCallback, useEffect, useRef, useState } from 'react';
import { OPEN_APP_CHECK_MS } from '../constants/appLink';

export type OpenAppStatus = 'idle' | 'trying' | 'not_opened';

export function useOpenApp(appLink: string | null) {
  const [status, setStatus] = useState<OpenAppStatus>('idle');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const open = useCallback(() => {
    if (!appLink || typeof document === 'undefined') return;
    cleanupRef.current?.();

    const target = document;
    const timer = setTimeout(() => {
      cleanup();
      setStatus(target.visibilityState === 'visible' ? 'not_opened' : 'idle');
    }, OPEN_APP_CHECK_MS);
    const handleVisibility = () => {
      if (target.visibilityState === 'hidden') {
        cleanup();
        setStatus('idle');
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener('visibilitychange', handleVisibility);
      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;
    target.addEventListener('visibilitychange', handleVisibility);
    setStatus('trying');
    target.location.assign(appLink);
  }, [appLink]);

  return { status, open };
}
