import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { CarapaceHost } from "./types";

const HostContext = createContext<CarapaceHost | null>(null);

export function HostProvider(props: { host: CarapaceHost; children: ReactNode }) {
  return (
    <HostContext.Provider value={props.host}>
      {props.children}
    </HostContext.Provider>
  );
}

export function useHost(): CarapaceHost {
  const host = useContext(HostContext);
  if (host === null) {
    throw new Error("useHost must be used within a <HostProvider>");
  }
  return host;
}

/** Like {@link useHost} but returns null instead of throwing when there is no
 *  `HostProvider` — for components that work with or without a platform host. */
export function useOptionalHost(): CarapaceHost | null {
  return useContext(HostContext);
}
