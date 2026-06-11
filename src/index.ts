// Host
export type { CarapaceHost, DirEntry, ChangeKind } from "./host/types";
export { HostProvider, useHost } from "./host/context";
export { createMemoryHost } from "./host/memoryHost";

// Primitives
export { Button } from "./primitives/Button";
export type { ButtonProps } from "./primitives/Button";
export { SpinSlider } from "./primitives/SpinSlider";
export type { SpinSliderProps } from "./primitives/SpinSlider";
export { Sash } from "./primitives/Sash";
export type { SashProps } from "./primitives/Sash";
export { SplitView, resizeSplit } from "./primitives/SplitView";
export type { SplitViewProps } from "./primitives/SplitView";
export { Badge } from "./primitives/Badge";
export type { BadgeTone } from "./primitives/Badge";
export { Card } from "./primitives/Card";
export { Toolbar } from "./primitives/Toolbar";
export type { ToolbarProps } from "./primitives/Toolbar";
export { SectionHeader } from "./primitives/SectionHeader";
export { PageHeader } from "./primitives/PageHeader";
export type { PageHeaderProps } from "./primitives/PageHeader";

// Form controls
export { FormEnum } from "./form/FormEnum";
export type { FormEnumProps } from "./form/FormEnum";
export { FormVec } from "./form/FormVec";
export type { FormVecProps } from "./form/FormVec";
export { FormToggle } from "./form/FormToggle";
export type { FormToggleProps } from "./form/FormToggle";
export { FormSlider } from "./form/FormSlider";
export type { FormSliderProps } from "./form/FormSlider";
export { FormColor } from "./form/FormColor";
export type { FormColorProps } from "./form/FormColor";

// Colour
export {
  rgbToHsv,
  hsvToRgb,
  srgbToLinear,
  linearToSrgb,
  rgbToHex,
  hexToRgb,
  encodeHdr,
  decodeHdr,
} from "./color/colorMath";
export { ColorPicker } from "./color/ColorPicker";
export type { ColorPickerProps } from "./color/ColorPicker";
export { ColorWheel } from "./color/ColorWheel";
export type { ColorWheelProps } from "./color/ColorWheel";
export { ColorSlider } from "./color/ColorSlider";
export type { ColorSliderProps } from "./color/ColorSlider";
export { ColorPickerButton } from "./color/ColorPickerButton";

// Pickers
export { DirectionPicker } from "./picker/DirectionPicker";
export type { DirectionPickerProps } from "./picker/DirectionPicker";
export { PositionPicker } from "./picker/PositionPicker";
export type { PositionPickerProps } from "./picker/PositionPicker";

// Utilities
export { cx } from "./cx";
export type { ClassValue } from "./cx";

// Tree
export { TreeView } from "./tree/TreeView";
export { FileExplorer } from "./tree/FileExplorer";
export type { FileExplorerProps } from "./tree/FileExplorer";

// Editor
export { EditorTabs } from "./editor/EditorTabs";
export type { EditorTab, EditorTabsProps } from "./editor/EditorTabs";

// Output
export { OutputPanel } from "./output/OutputPanel";
export type { OutputLine, OutputPanelProps } from "./output/OutputPanel";
export { isCollapsible } from "./tree/treeTypes";
export type { TreeNode, FlatNode, TreeItemContext, TreeViewProps } from "./tree/treeTypes";
export {
  flattenVisible,
  findParentIndex,
  findFirstChildIndex,
  findNextFocusable,
  findPrevFocusable,
} from "./tree/treeModel";

// Shell
export { Workbench } from "./shell/Workbench";
export type { WorkbenchProps } from "./shell/Workbench";
export { TopBar } from "./shell/TopBar";
export type { TopBarProps } from "./shell/TopBar";
export { MenuBar } from "./shell/MenuBar";
export type { MenuBarProps } from "./shell/MenuBar";
export { WindowControls } from "./shell/WindowControls";
export { ActivityBar } from "./shell/ActivityBar";
export type { ActivityItem } from "./shell/ActivityBar";
export { StatusBar } from "./shell/StatusBar";
export type { StatusBarProps } from "./shell/StatusBar";

// Menu model
export type {
  MenuModel,
  TopMenu,
  MenuItem,
  MenuAction,
  MenuSeparator,
  Submenu,
  MenuCommandRef,
} from "./menu/model";
export { isAction, isSeparator, isSubmenu, isCommandRef } from "./menu/model";
export { parseMnemonic } from "./menu/mnemonic";
export type { ParsedMnemonic } from "./menu/mnemonic";
export { MenuList } from "./menu/MenuList";
export { ContextMenu, useContextMenu } from "./menu/ContextMenu";
export type { ContextMenuProps, ContextMenuState } from "./menu/ContextMenu";

// Commands
export type { Command, CommandRegistry } from "./command/registry";
export { createCommandRegistry } from "./command/registry";
export {
  CommandProvider,
  useCommands,
  useOptionalCommands,
  useCommandKeybindings,
} from "./command/context";
export { CommandPalette } from "./command/CommandPalette";
export type { CommandPaletteProps } from "./command/CommandPalette";
export { parseChord, matchEvent } from "./command/keybinding";
export type { Chord } from "./command/keybinding";

// Overlay
export { Modal } from "./overlay/Modal";
export type { ModalProps } from "./overlay/Modal";
export { ConfirmDialog } from "./overlay/ConfirmDialog";
export type { ConfirmDialogProps } from "./overlay/ConfirmDialog";
export { PromptDialog } from "./overlay/PromptDialog";
export type { PromptDialogProps } from "./overlay/PromptDialog";
export { TypedConfirmDialog } from "./overlay/TypedConfirmDialog";
export type { TypedConfirmDialogProps } from "./overlay/TypedConfirmDialog";
export { ErrorBoundary } from "./overlay/ErrorBoundary";
export { ToastProvider, useToast } from "./overlay/Toast";
export type { ToastTone } from "./overlay/Toast";
