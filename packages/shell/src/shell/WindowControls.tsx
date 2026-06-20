import { useOptionalHost } from "../host/context";

/** Host-driven window controls (min/max/close). Used by TopBar. Renders nothing
 *  when there is no `HostProvider` — e.g. an app that keeps the OS window frame. */
export function WindowControls() {
  const host = useOptionalHost();
  if (!host) return null;
  return (
    <div className="flex gap-1">
      <button
        aria-label="Minimize"
        className="px-2 hover:bg-surface-raised"
        onClick={() => host.window.minimize()}
      >
        &#x2013;
      </button>
      <button
        aria-label="Maximize"
        className="px-2 hover:bg-surface-raised"
        onClick={() => void host.window.toggleMaximize()}
      >
        &#x25A1;
      </button>
      <button
        aria-label="Close"
        className="px-2 hover:bg-accent hover:text-accent-fg"
        onClick={() => host.window.close()}
      >
        &#x2715;
      </button>
    </div>
  );
}
