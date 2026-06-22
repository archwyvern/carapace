import { useEffect, useMemo, useRef, useState } from "react";
import {
  FloatingFocusManager, FloatingList, FloatingNode, FloatingPortal,
  autoUpdate, safePolygon, useDismiss, useFloating, useFloatingNodeId, useFloatingTree,
  useHover, useInteractions, useListItem, useListNavigation, useMergeRefs, useRole, useTypeahead,
} from "@floating-ui/react";
import { menuMiddleware } from "./useMenuPosition";
import type { MenuItem, Submenu as SubmenuModel, SubmenuItems } from "./model";
import { MenuRowShell, SubmenuArrow } from "./MenuRow";
import type { MenuSize } from "./MenuRow";
import { parseMnemonic } from "./mnemonic";
import { Spinner } from "../primitives/Spinner";
import { MenuRenderContext, Row, useMenuRender } from "./Menu";
import type { MenuRenderCtx } from "./Menu";

/** Resolve eager / lazy / async submenu item sources, exposing a loading state. */
function useSubmenuItems(source: SubmenuItems, open: boolean): { items: MenuItem[]; loading: boolean } {
  const [state, setState] = useState<{ items: MenuItem[]; loading: boolean }>(
    Array.isArray(source) ? { items: source, loading: false } : { items: [], loading: true },
  );
  useEffect(() => {
    if (Array.isArray(source)) {
      setState({ items: source, loading: false });
      return;
    }
    if (!open) return;
    let cancelled = false;
    setState({ items: [], loading: true });
    Promise.resolve(source()).then((items) => {
      if (!cancelled) setState({ items, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [source, open]);
  return state;
}

export function Submenu({ item, size }: { item: SubmenuModel; size: MenuSize }) {
  const parent = useMenuRender();
  const [open, setOpen] = useState(false);
  const nodeId = useFloatingNodeId();
  const tree = useFloatingTree();
  const disabled = item.enabled === false;

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    nodeId,
    open,
    onOpenChange: setOpen,
    placement: "right-start",
    strategy: "fixed",
    // Position via top/left, not transform — the open animation animates `transform`.
    transform: false,
    middleware: menuMiddleware({ submenu: true }),
    whileElementsMounted: autoUpdate,
  });

  const listItem = useListItem({ label: disabled ? null : parseMnemonic(item.label).text });
  const active = parent.activeIndex === listItem.index;
  const referenceRef = useMergeRefs([refs.setReference, listItem.ref]);

  const hover = useHover(context, { enabled: !disabled, delay: { open: 250 }, handleClose: safePolygon() });
  const role = useRole(context, { role: "menu" });
  const dismiss = useDismiss(context);
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const nav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    nested: true,
    loop: true,
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: open ? setActiveIndex : undefined,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    hover, role, dismiss, nav, typeahead,
  ]);

  const { items, loading } = useSubmenuItems(item.items, open);

  // Activating any leaf anywhere in the tree closes this submenu too.
  useEffect(() => {
    if (!tree) return;
    const onTreeClick = () => setOpen(false);
    tree.events.on("click", onTreeClick);
    return () => tree.events.off("click", onTreeClick);
  }, [tree]);

  const childCtx = useMemo<MenuRenderCtx>(
    () => ({ getItemProps, activeIndex, size, close: parent.close, onAction: parent.onAction }),
    [getItemProps, activeIndex, size, parent.close, parent.onAction],
  );

  return (
    <FloatingNode id={nodeId}>
      <MenuRowShell
        ref={referenceRef}
        role="menuitem"
        size={size}
        disabled={disabled}
        active={active || open}
        tabIndex={active ? 0 : -1}
        ariaProps={{ "aria-haspopup": "menu", "aria-expanded": open }}
        itemProps={getReferenceProps(parent.getItemProps())}
        leading={item.icon ?? null}
        label={parseMnemonic(item.label).text}
        trailing={<SubmenuArrow />}
      />
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus={false}>
            <div
              ref={refs.setFloating}
              tabIndex={-1}
              style={{ ...floatingStyles, opacity: isPositioned ? undefined : 0 }}
              className={`z-[100] flex min-w-[12rem] flex-col overflow-hidden border border-border bg-surface-raised py-1 text-fg shadow-lg outline-none${isPositioned ? " motion-safe:animate-[menu-in_80ms_ease-out]" : ""}`}
              {...getFloatingProps()}
            >
              <div className="max-h-[var(--menu-max-h,80vh)] overflow-y-auto">
                {loading && (
                  <div className="flex items-center gap-2 px-2 py-1 text-base text-fg-mid">
                    <Spinner size="sm" /> Loading…
                  </div>
                )}
                {!loading && items.length === 0 && (
                  <div className="px-2 py-1 text-base italic text-fg-mid">(empty)</div>
                )}
                {!loading && items.length > 0 && (
                  <MenuRenderContext.Provider value={childCtx}>
                    <FloatingList elementsRef={listRef} labelsRef={labelsRef}>
                      {items.map((it, i) => (
                        <Row key={i} item={it} />
                      ))}
                    </FloatingList>
                  </MenuRenderContext.Provider>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </FloatingNode>
  );
}
