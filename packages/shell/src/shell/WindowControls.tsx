import { useOptionalHost } from "../host/context";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "../icons";

const BUTTON = "flex h-9 w-9 items-center justify-center hover:bg-accent hover:text-accent-fg";

/** Host-driven window controls (min/max/close). Used by TopBar. Renders nothing
 *  when there is no `HostProvider` — e.g. an app that keeps the OS window frame.
 *  Bar-height SQUARE hit targets (px strips were hard to hit) with the gold accent
 *  hover on all three, matching the close button. */
export function WindowControls() {
  const host = useOptionalHost();
  if (!host) return null;
  return (
    <div className="flex">
      <button aria-label="Minimize" className={BUTTON} onClick={() => host.window.minimize()}>
        <MinimizeIcon className="h-3.5 w-3.5" />
      </button>
      <button aria-label="Maximize" className={BUTTON} onClick={() => void host.window.toggleMaximize()}>
        <MaximizeIcon className="h-3.5 w-3.5" />
      </button>
      <button aria-label="Close" className={BUTTON} onClick={() => host.window.close()}>
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
