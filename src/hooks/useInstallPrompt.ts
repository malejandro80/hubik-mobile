import { useCallback, useState } from 'react';

export function useInstallPrompt() {
  const [sheetVisible, setSheetVisible] = useState(true);
  const dismiss = useCallback(() => setSheetVisible(false), []);
  const reopen = useCallback(() => setSheetVisible(true), []);
  return { sheetVisible, dismiss, reopen };
}
