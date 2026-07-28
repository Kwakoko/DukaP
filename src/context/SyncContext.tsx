import React, { createContext, useContext } from 'react';
import { useSync } from '../hooks/useSync';

type SyncContextType = ReturnType<typeof useSync>;

const SyncContext = createContext<SyncContextType | undefined>(undefined);

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
  if (!context) {
    throw new Error('useSyncState must be used within a SyncProvider');
  }
  return context;
};
