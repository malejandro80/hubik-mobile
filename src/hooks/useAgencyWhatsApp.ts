import { useCallback, useEffect, useState } from 'react';
import { fetchAgencyWhatsApp, updateAgencyWhatsApp } from '../services/authApi';

export function useAgencyWhatsApp(agencyId: string | null) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    let active = true;
    fetchAgencyWhatsApp(agencyId).then((phone) => {
      if (active) setValue(phone);
    });
    return () => {
      active = false;
    };
  }, [agencyId]);

  const save = useCallback(
    async (phone: string | null) => {
      if (!agencyId) return;
      await updateAgencyWhatsApp(agencyId, phone);
      setValue(phone);
    },
    [agencyId]
  );

  return { value, save };
}
