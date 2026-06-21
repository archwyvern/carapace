import { useOptionalHost } from "../host/context";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "../icons";

/** Host-driven window controls (min/max/close). Used by TopBar. Renders nothing
 *  when there is no `HostProvider` — e.g. an app that keeps the OS window frame. */
export function WindowControls() {
  const host = useOptionalHost();
  if (!host) return null;
  return (
    <div className="flex gap-1">
      <button
        aria-label="Minimize"
        className="flex items-center px-2 hover:bg-surface-raised"
        onClick={() => host.window.minimize()}
      >
        <MinimizeIcon className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label="Maximize"
        className="flex items-center px-2 hover:bg-surface-raised"
        onClick={() => void host.window.toggleMaximize()}
      >
        <MaximizeIcon className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label="Close"
        className="flex items-center px-2 hover:bg-accent hover:text-accent-fg"
        onClick={() => host.window.close()}
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
