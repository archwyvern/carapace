import { createContext, useContext, type ReactNode } from "react";
import { StateService } from "./StateService";

const StateCtx = createContext<StateService | null>(null);

// Shell-default service: components using useMemento still persist (to localStorage
// under "carapace:") even when an app doesn't mount its own StateProvider. Apps
// override by providing a service scoped to their app/project.
let fallback: StateService | null = null;
function defaultService(): StateService {
  return (fallback ??= new StateService({ prefix: "carapace:" }));
}

export function StateProvider({ service, children }: { service: StateService; children: ReactNode }) {
  return <StateCtx.Provider value={service}>{children}</StateCtx.Provider>;
}

export function useStateService(): StateService {
  return useContext(StateCtx) ?? defaultService();
}
