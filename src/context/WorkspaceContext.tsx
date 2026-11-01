import React, { createContext, useContext } from 'react';
import type { Workspace } from '../lib/workspaces';

const WorkspaceContext = createContext<Workspace | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useActiveWorkspace(): Workspace | null {
  return useContext(WorkspaceContext);
}
