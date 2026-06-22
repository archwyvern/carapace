import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  FloatingFocusManager, FloatingList, FloatingPortal, FloatingTree,
  autoUpdate, useDismiss, useFloating, useFloatingNodeId, useFloatingParentNodeId,
  useInteractions, useListItem, useListNavigation, useRole, useTypeahead,
} from "@floating-ui/react";
import { menuMiddleware, pointReference } from "./useMenuPosition";
import type { MenuAnchor } from "./useMenuPosition";
import { isCustom, isHeader, isRadioGroup, isSeparator, isSubmenu } from "./model";
import type { MenuAction, MenuCommandRef, MenuCustom, MenuItem, MenuRadioGroup } from "./model";
import { isCommandRef } from "./model";
import {
  CheckSlot, KeybindingChip, MenuRowShell, RadioDot, RowHeader, RowSeparator, rowClass,
} from "./MenuRow";
import type { MenuSize } from "./MenuRow";
import { parseMnemonic } from "./mnemonic";
import { useOptionalCommands } from "../command/context";
import { Submenu as SubmenuRow } from "./Submenu";
import { cx } from "../cx";
import { SearchIcon } from "../icons";

// Provided to descendant rows (and nested submenus) so they share the active list.
export interface MenuRenderCtx {
  getItemProps: (userProps?: Record<string, unknown>) => Record<string, unknown>;
  activeIndex: number | null;
  size: MenuSize;
  close: () => void;
  onAction?: (item: MenuAction) => void;
}
export const MenuRenderContext = createContext<MenuRenderCtx | null>(null);
export function useMenuRender(): MenuRenderCtx {
  const ctx = useContext(MenuRenderContext);
  if (!ctx) throw new Error("Menu row rendered outside <Menu>");
  return ctx;
}

export interface MenuProps {
  items: MenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: MenuAnchor;
  size?: MenuSize;
  filterable?: boolean;
  ariaLabel?: string;
  onAction?: (item: MenuAction) => void;
  className?: string;
  /** Trap focus and hide the rest of the page (context-menu default). Menu bars pass false. */
  modal?: boolean;
}

type ResolvedCommand = {
  label?: string; keybinding?: string; icon?: ReactNode; description?: string; checked?: boolean;
};

/** Resolve a command-ref to the uniform action shape, reading the optional registry. */
function useResolvedItems(items: MenuItem[]): MenuItem[] {
  const registry = useOptionalCommands();
  return useMemo(() => {
    return items.map((item): MenuItem => {
      if (!isCommandRef(item)) return item;
      const ref = item as MenuCommandRef;
      const cmd = registry?.get(ref.command) as ResolvedCommand | undefined;
      const action: MenuAction = {
        id: ref.command,
        label: cmd?.label ?? ref.command,
        shortcut: cmd?.keybinding,
        icon: cmd?.icon,
        description: cmd?.description,
        checked: cmd?.checked,
        role: cmd?.checked === undefined ? undefined : "checkbox",
        enabled: !!cmd && (registry?.isEnabled(ref.command) ?? false),
        run: () => registry?.run(ref.command),
      };
      return action;
    });
  }, [items, registry]);
}

export function Menu(props: MenuProps) {
  const parentId = useFloatingParentNodeId();
  if (parentId === null) {
    return (
      <FloatingTree>
        <MenuInner {...props} />
      </FloatingTree>
    );
  }
  return <MenuInner {...props} />;
}

function MenuInner(props: MenuProps) {
  const { items, open, onOpenChange, anchor, size = "sm", filterable, ariaLabel, onAction, className, modal = true } = props;
  const resolved = useResolvedItems(items);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    if (!filterable || !query) return resolved;
    const q = query.toLowerCase();
    return resolved.filter((it) => {
      if (isSeparator(it) || isHeader(it)) return false;
      const label = isSubmenu(it)
        ? it.label
        : isRadioGroup(it)
          ? it.name ?? ""
          : isCustom(it)
            ? ""
            : (it as MenuAction).label;
      return parseMnemonic(label).text.toLowerCase().includes(q);
    });
  }, [resolved, filterable, query]);

  // A real element, or a virtual reference at the cursor point. The position reference is
  // set separately from the (dom) reference: interaction hooks need a real element, while
  // a cursor anchor is virtual and only drives positioning. `strategy: "fixed"` anchors to
  // the viewport so cursor coords land correctly regardless of the portal's offset parent.
  const reference = useMemo(
    () => (anchor instanceof HTMLElement ? anchor : anchor ? pointReference(anchor) : null),
    [anchor],
  );

  const nodeId = useFloatingNodeId();
  const { refs, floatingStyles, context, isPositioned } = useFloating({
    nodeId,
    open,
    onOpenChange,
    placement: "bottom-start",
    strategy: "fixed",
    // Position via top/left, not transform: the open animation animates `transform`
    // (scale), which would otherwise override floating-ui's positioning translate and
    // snap the menu to the top-left corner.
    transform: false,
    middleware: menuMiddleware(),
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (reference) {
      refs.setPositionReference(reference);
      setAnchored(true);
    }
  }, [reference, refs]);

  // The floating element must not mount until the position reference is set, otherwise
  // floating-ui's first compute runs against a null/cursor-less reference and the menu
  // sticks at the top-left (a virtual reference set afterwards doesn't re-trigger it).
  const [anchored, setAnchored] = useState(false);
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const role = useRole(context, { role: "menu" });
  const dismiss = useDismiss(context, { outsidePress: true });
  const nav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
    focusItemOnOpen: false,
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: open ? setActiveIndex : undefined,
    enabled: !filterable,
  });
  const { getFloatingProps, getItemProps } = useInteractions([role, dismiss, nav, typeahead]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const renderCtx = useMemo<MenuRenderCtx>(
    () => ({ getItemProps, activeIndex, size, close, onAction }),
    [getItemProps, activeIndex, size, close, onAction],
  );

  if (!open || !anchored) return null;

  // A FloatingPortal moves the menu's DOM under document.body, but React still bubbles its synthetic
  // events up the *component* tree to the menu's logical parent. When that parent is a gesture
  // surface — e.g. a canvas that calls setPointerCapture on pointerdown — a press on a menu item
  // would start a host drag, and the captured pointer retargets the follow-up click off the item so
  // it never fires. Insulate the overlay: run floating-ui's own handler, then stop the press from
  // leaking past the menu. (useDismiss/outside-press use native document listeners, so this React
  // synthetic stopPropagation does not affect open/close behaviour.)
  const floatingProps = getFloatingProps();
  const insulate =
    (inner: unknown) =>
    (e: ReactPointerEvent | ReactMouseEvent) => {
      (inner as ((ev: ReactPointerEvent | ReactMouseEvent) => void) | undefined)?.(e);
      e.stopPropagation();
    };

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={modal} returnFocus>
        <div
          ref={refs.setFloating}
          tabIndex={-1}
          style={{ ...floatingStyles, opacity: isPositioned ? undefined : 0 }}
          className={cx(
            "z-[100] flex min-w-[12rem] flex-col overflow-hidden border border-border bg-surface-raised py-1 text-fg shadow-lg outline-none",
            // Only animate once positioned, else the opacity keyframe overrides the inline
            // opacity:0 gate and plays the open animation at the top-left pre-position spot.
            isPositioned && "motion-safe:animate-[menu-in_80ms_ease-out]",
            className,
          )}
          aria-label={ariaLabel}
          {...floatingProps}
          onPointerDown={insulate(floatingProps.onPointerDown)}
          onMouseDown={insulate(floatingProps.onMouseDown)}
        >
          {filterable && (
            <div className="mb-1 flex items-center gap-2 border-b border-border px-2 pb-1">
              <SearchIcon className="h-3.5 w-3.5 shrink-0 text-fg-mid" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-full bg-transparent text-base outline-none placeholder:text-fg-mid"
              />
            </div>
          )}
          <div className="max-h-[var(--menu-max-h,80vh)] overflow-y-auto">
            <MenuRenderContext.Provider value={renderCtx}>
              <FloatingList elementsRef={listRef} labelsRef={labelsRef}>
                {visible.map((item, i) => (
                  <Row key={i} item={item} />
                ))}
              </FloatingList>
            </MenuRenderContext.Provider>
          </div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

export function Row({ item }: { item: MenuItem }) {
  const { size } = useMenuRender();
  if (isSeparator(item)) return <RowSeparator />;
  if (isHeader(item)) return <RowHeader text={item.header} />;
  if (isSubmenu(item)) return <SubmenuRow item={item} size={size} />;
  if (isRadioGroup(item)) return <RadioRows group={item} />;
  if (isCustom(item)) return <CustomRow item={item} />;
  return <ActionRow action={item as MenuAction} />;
}

function MnemonicLabel({ text, index }: { text: string; index: number }) {
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="underline">{text[index]}</span>
      {text.slice(index + 1)}
    </>
  );
}

function ActionRow({ action }: { action: MenuAction }) {
  const { getItemProps, activeIndex, size, close, onAction } = useMenuRender();
  const disabled = action.enabled === false;
  const checkbox = action.role === "checkbox";
  const { text, index: mIdx, key: mKey } = parseMnemonic(action.label);
  const item = useListItem({ label: disabled ? null : text });
  const active = activeIndex === item.index;
  const trailing =
    action.trailingIcon || action.badge || action.shortcut ? (
      <>
        {action.trailingIcon}
        {action.badge}
        {action.shortcut && <KeybindingChip text={action.shortcut} />}
      </>
    ) : undefined;
  return (
    <MenuRowShell
      ref={item.ref}
      role={checkbox ? "menuitemcheckbox" : "menuitem"}
      size={size}
      danger={action.danger}
      disabled={disabled}
      active={active}
      tabIndex={active ? 0 : -1}
      ariaProps={{
        "aria-checked": checkbox ? !!action.checked : undefined,
        "aria-keyshortcuts": mKey ?? undefined,
        title: disabled ? action.disabledReason : action.tooltip,
      }}
      itemProps={getItemProps({
        onClick() {
          if (disabled) return;
          action.run();
          onAction?.(action);
          if (!action.keepOpen) close();
        },
        onPointerMove: action.onHover,
      })}
      leading={action.icon ?? (checkbox ? <CheckSlot checked={!!action.checked} /> : null)}
      label={<MnemonicLabel text={text} index={mIdx} />}
      description={action.description}
      trailing={trailing}
    />
  );
}

function RadioRows({ group }: { group: MenuRadioGroup }) {
  return (
    <div role="group" aria-label={group.name}>
      {group.options.map((opt) => (
        <RadioOption key={opt.value} group={group} opt={opt} />
      ))}
    </div>
  );
}

function RadioOption({ group, opt }: { group: MenuRadioGroup; opt: MenuRadioGroup["options"][number] }) {
  const { getItemProps, activeIndex, size, close, onAction } = useMenuRender();
  const item = useListItem({ label: opt.disabled ? null : opt.label });
  const active = activeIndex === item.index;
  const selected = opt.value === group.value;
  return (
    <MenuRowShell
      ref={item.ref}
      role="menuitemradio"
      size={size}
      disabled={opt.disabled}
      active={active}
      tabIndex={active ? 0 : -1}
      ariaProps={{ "aria-checked": selected }}
      itemProps={getItemProps({
        onClick() {
          if (opt.disabled) return;
          group.onChange(opt.value);
          onAction?.({ label: opt.label, run: () => group.onChange(opt.value) });
          close();
        },
      })}
      leading={opt.icon ?? <RadioDot selected={selected} />}
      label={opt.label}
    />
  );
}

function CustomRow({ item }: { item: MenuCustom }) {
  const { close } = useMenuRender();
  if (!item.focusable) {
    return <div role="none" className="px-2 py-1">{item.render({ close, active: false })}</div>;
  }
  return <FocusableCustomRow item={item} />;
}

function FocusableCustomRow({ item }: { item: MenuCustom }) {
  const { getItemProps, activeIndex, close } = useMenuRender();
  const li = useListItem({ label: null });
  const active = activeIndex === li.index;
  const activate = () => {
    item.onActivate?.();
    close();
  };
  return (
    <div
      ref={li.ref as unknown as React.Ref<HTMLDivElement>}
      role="menuitem"
      tabIndex={active ? 0 : -1}
      className={cx(rowClass(), "block")}
      {...getItemProps({
        onClick: activate,
        onKeyDown(e: React.KeyboardEvent) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        },
      })}
    >
      {item.render({ close, active })}
    </div>
  );
}
