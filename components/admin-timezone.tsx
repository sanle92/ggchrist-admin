'use client';

import { createContext, useContext } from 'react';

const AdminTimezoneContext = createContext('Africa/Kampala');

export function AdminTimezoneProvider({ timezone, children }: { timezone: string; children: React.ReactNode }) {
  return <AdminTimezoneContext.Provider value={timezone}>{children}</AdminTimezoneContext.Provider>;
}

export function useAdminTimezone() {
  return useContext(AdminTimezoneContext);
}
