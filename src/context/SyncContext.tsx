import React, { createContext, useContext } from 'react';
import { useSync } from '../hooks/useSync';

type SyncContextType = ReturnType<typeof useSync>;

const defaultSyncContext = {
  isOnline: true,
  syncStatus: 'SYNCED',
  pendingCount: 0,
  lastSyncTime: null,
  syncError: null,
  syncFromServer: async () => {},
  pushLocalChanges: async () => {},
  forceFullSync: async () => {}
} as any;

const SyncContext = createContext<SyncContextType>(defaultSyncContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncValue = useSync();

  return (
    <SyncContext.Provider value={syncValue}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncState = () => {
  const context = useContext(SyncContext);
  return context || defaultSyncContext;
};
