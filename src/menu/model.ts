// Carapace menu data model — mirrors VS Code's base model
// (vscode/src/vs/base/common/actions.ts IAction, base/browser/ui/menu/menubar.ts
// MenuBarMenu). The menu is data so items, shortcuts, and the command palette can
// share one source of truth.

export interface MenuAction {
  id: string;
  /** Display label; `&&` marks the mnemonic letter (VS Code convention): "&&New". */
  label: string;
  /** Display-only shortcut hint, e.g. "Ctrl+N". */
  shortcut?: string;
  /** Defaults to true. */
  enabled?: boolean;
  /** Renders a check/toggle indicator. */
  checked?: boolean;
  run: () => void;
}

export interface MenuSeparator {
  separator: true;
}

export interface Submenu {
  /** `&&` marks the mnemonic letter. */
  label: string;
  items: MenuItem[];
}

export interface MenuCommandRef {
  /** Reference to a registered command id; label/shortcut/enabled come from it. */
  command: string;
}

export type MenuItem = MenuAction | MenuSeparator | Submenu | MenuCommandRef;

export interface TopMenu {
  /** `&&` marks the mnemonic letter: "&&File". */
  label: string;
  items: MenuItem[];
}

export type MenuModel = TopMenu[];

export function isSeparator(item: MenuItem): item is MenuSeparator {
  return (item as MenuSeparator).separator === true;
}

export function isSubmenu(item: MenuItem): item is Submenu {
  return !isSeparator(item) && Array.isArray((item as Submenu).items);
}

export function isAction(item: MenuItem): item is MenuAction {
  return !isSeparator(item) && typeof (item as MenuAction).run === "function";
}

export function isCommandRef(item: MenuItem): item is MenuCommandRef {
  return typeof (item as MenuCommandRef).command === "string";
}
