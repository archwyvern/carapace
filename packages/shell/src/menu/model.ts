// Carapace menu data model — mirrors VS Code's base model (IAction / SubmenuAction)
// but expanded: checkbox/radio, headers, descriptions, lazy submenus, custom rows.
// The menu is data so items, shortcuts, and the command palette share one source of truth.

import type { ReactNode } from "react";

export interface MenuAction {
  /** Stable id, used by menu-bar/command integration. Optional for ad-hoc items. */
  id?: string;
  /** Display label; `&&` marks the mnemonic letter (VS Code convention): "&&New". */
  label: string;
  /** Secondary text rendered under/after the label. */
  description?: string;
  /** Display-only shortcut hint, e.g. "Ctrl+N". */
  shortcut?: string;
  /** Leading icon node. */
  icon?: ReactNode;
  /** Trailing icon node, before the shortcut chip. */
  trailingIcon?: ReactNode;
  /** Small trailing badge node. */
  badge?: ReactNode;
  /** Defaults to true. */
  enabled?: boolean;
  /** Tooltip shown when the item is disabled (explains why). */
  disabledReason?: string;
  /** Tooltip shown when enabled. */
  tooltip?: string;
  /** Render as a checkbox item (role=menuitemcheckbox). */
  role?: "checkbox";
  /** Check/toggle state when role === "checkbox" (or a plain toggle). */
  checked?: boolean;
  /** Keep the menu open after activating (for toggles). */
  keepOpen?: boolean;
  /** Destructive action — rendered with the error tone. */
  danger?: boolean;
  /** Fired when the row gains hover/focus. */
  onHover?: () => void;
  run: () => void;
}

export interface MenuRadioGroup {
  radio: true;
  /** ARIA grouping name. */
  name?: string;
  value: string;
  options: { value: string; label: string; icon?: ReactNode; disabled?: boolean }[];
  onChange: (value: string) => void;
}

export interface MenuHeader {
  /** Non-interactive group label. */
  header: string;
}

export interface MenuSeparator {
  separator: true;
}

export type SubmenuItems = MenuItem[] | (() => MenuItem[] | Promise<MenuItem[]>);

export interface Submenu {
  /** `&&` marks the mnemonic letter. */
  label: string;
  icon?: ReactNode;
  enabled?: boolean;
  /** Eager array, or a lazy/async producer resolved on first open. */
  items: SubmenuItems;
}

export interface MenuCommandRef {
  /** Reference to a registered command id; label/shortcut/enabled/checked come from it. */
  command: string;
}

export interface MenuCustom {
  /** Render arbitrary row content. */
  render: (api: { close: () => void; active: boolean }) => ReactNode;
  /** Participate in roving focus / keyboard activation. */
  focusable?: boolean;
  /** Enter/Space handler when focusable. */
  onActivate?: () => void;
}

export type MenuItem =
  | MenuAction
  | MenuRadioGroup
  | MenuHeader
  | MenuSeparator
  | Submenu
  | MenuCommandRef
  | MenuCustom;

export interface TopMenu {
  /** `&&` marks the mnemonic letter: "&&File". */
  label: string;
  items: MenuItem[];
}

export type MenuModel = TopMenu[];

export function isSeparator(item: MenuItem): item is MenuSeparator {
  return (item as MenuSeparator).separator === true;
}

export function isHeader(item: MenuItem): item is MenuHeader {
  return typeof (item as MenuHeader).header === "string";
}

export function isRadioGroup(item: MenuItem): item is MenuRadioGroup {
  return (item as MenuRadioGroup).radio === true;
}

export function isCustom(item: MenuItem): item is MenuCustom {
  return typeof (item as MenuCustom).render === "function";
}

export function isCommandRef(item: MenuItem): item is MenuCommandRef {
  return typeof (item as MenuCommandRef).command === "string";
}

export function isSubmenu(item: MenuItem): item is Submenu {
  if (isSeparator(item) || isHeader(item) || isRadioGroup(item) || isCustom(item)) return false;
  const items = (item as Submenu).items;
  return Array.isArray(items) || typeof items === "function";
}

export function isAction(item: MenuItem): item is MenuAction {
  return (
    !isSeparator(item) &&
    !isHeader(item) &&
    !isRadioGroup(item) &&
    !isCustom(item) &&
    !isSubmenu(item) &&
    !isCommandRef(item) &&
    typeof (item as MenuAction).run === "function"
  );
}
