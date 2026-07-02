// Host
export type { CarapaceHost, DirEntry, ChangeKind, FileSystemProvider } from "./host/types";
export { HostProvider, useHost, useOptionalHost } from "./host/context";
export { createMemoryHost } from "./host/memoryHost";

// Primitives
export { Button } from "./primitives/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./primitives/Button";
export { SaveStatus } from "./primitives/SaveStatus";
export type { SaveState, SaveStatusProps } from "./primitives/SaveStatus";
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
export { Breadcrumb } from "./primitives/Breadcrumb";
export type { BreadcrumbItem, BreadcrumbProps } from "./primitives/Breadcrumb";
export { IconButton } from "./primitives/IconButton";
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from "./primitives/IconButton";
export { Segmented, ToggleButton } from "./primitives/ToggleButton";
export type { SegmentedOption, SegmentedProps, ToggleButtonProps } from "./primitives/ToggleButton";
export { TextInput } from "./primitives/TextInput";
export type { TextInputProps } from "./primitives/TextInput";
export { Spinner } from "./primitives/Spinner";
export type { SpinnerSize } from "./primitives/Spinner";
export { Collapsible } from "./primitives/Collapsible";
export type { CollapsibleProps, CollapsibleVariant } from "./primitives/Collapsible";
export { StructCard } from "./primitives/StructCard";
export type { StructCardProps } from "./primitives/StructCard";
export { useNestedSurface, SurfaceProvider } from "./primitives/Surface";
export { StatusDot } from "./primitives/StatusDot";
export type { StatusDotProps } from "./primitives/StatusDot";
export { Select } from "./primitives/Select";
export type { SelectProps, SelectOption } from "./primitives/Select";
export { TagInput } from "./primitives/TagInput";
export type { TagInputProps } from "./primitives/TagInput";
export { Palette } from "./primitives/Palette";
export type { PaletteProps, PaletteItem, PaletteGroup } from "./primitives/Palette";

// Layout
export { Panel } from "./layout/Panel";
export type { PanelProps } from "./layout/Panel";
export { Grid } from "./layout/Grid";
export type { GridProps } from "./layout/Grid";
export { Thumbnail } from "./layout/Thumbnail";
export type { ThumbnailProps } from "./layout/Thumbnail";
export { PanelGroup, SplitPane, SASH_SIZE } from "./layout/PanelGroup";
export type { PanelGroupProps, SplitPaneProps } from "./layout/PanelGroup";

// Navigation
export { Tabs } from "./navigation/Tabs";
export type { TabsProps, TabItem, TabsVariant } from "./navigation/Tabs";

// Feedback
export { EmptyState } from "./feedback/EmptyState";
export type { EmptyStateProps, EmptyStateStatus } from "./feedback/EmptyState";

// Hooks
export { useGridSelection } from "./hooks/useGridSelection";
export type { GridSelection, GridSelectionOptions, GridSelectionMods } from "./hooks/useGridSelection";
// The `History` snapshot store is a framework-agnostic primitive in @carapace/resources (next to
// Observable); this is just its React binding, structural so shell needn't depend on resources.
export { useHistory } from "./history/useHistory";
export type { HistoryState, HistoryLike } from "./history/useHistory";

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
export { FormString } from "./form/FormString";
export type { FormStringProps } from "./form/FormString";
export { FieldLayout } from "./form/FieldLayout";
export type { FieldLayoutProps, FieldLayoutMode } from "./form/FieldLayout";

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
export { GradientBar } from "./color/GradientBar";
export type { GradientBarProps, GradientStop } from "./color/GradientBar";

// Pickers
export { DirectionPicker } from "./picker/DirectionPicker";
export type { DirectionPickerProps } from "./picker/DirectionPicker";
export { PositionPicker } from "./picker/PositionPicker";
export type { PositionPickerProps } from "./picker/PositionPicker";

// Utilities
export { cx } from "./cx";
export type { ClassValue } from "./cx";

// Icons — Fluent UI System Icons under carapace's semantic names (the shared icon vocabulary).
export { CloseIcon, AddIcon, MinimizeIcon, MaximizeIcon, ResetIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, InfoIcon, WarningIcon, ErrorIcon, SearchIcon } from "./icons";

// Tree
export { TreeView } from "./tree/TreeView";
export { FileExplorer } from "./tree/FileExplorer";
export type { FileExplorerProps, FileExplorerActions } from "./tree/FileExplorer";
export { FileTypeIcon } from "./tree/fileIcons/FileTypeIcon";
export type { FileTypeIconProps } from "./tree/fileIcons/FileTypeIcon";
export { registerFileIcons, resolveFileIcon, FileIconRegistry } from "./tree/fileIcons/registry";
export type { FileIconSpec, FileIconRef, FileIconOverrides } from "./tree/fileIcons/registry";
export { setiIconDefinitions } from "./tree/fileIcons/setiIconData";
export type { SetiIconDef } from "./tree/fileIcons/setiIconData";
export { TreeFind } from "./tree/TreeFind";
export type { TreeFindProps } from "./tree/TreeFind";
export { treeFilter } from "./tree/treeFilter";

// Editor
export { EditorTabs } from "./editor/EditorTabs";
export type { EditorTab, EditorTabsProps } from "./editor/EditorTabs";
export { CodeEditor, CARAPACE_DARK_THEME } from "./editor/CodeEditor";
export type { CodeEditorProps } from "./editor/CodeEditor";
export { configureMonacoOffline } from "./editor/monacoLoader";
export type { MonacoOfflineOptions, MonacoWorkerFactory } from "./editor/monacoLoader";
export { formatJs } from "./format/formatJs";
export type { FormatOptions } from "./format/formatJs";
export { humanizeLabel } from "./text";
export { parseGitPorcelainZ, scmDecoration } from "./scm/gitStatus";
export type { GitFileStatus, ScmDecoration } from "./scm/gitStatus";

// Persisted UI state (memento pattern): a backend-agnostic StateService behind a
// StateProvider, consumed via useMemento. Apps inject the service (localStorage by
// default; a remote/host adapter optional).
export { StateService } from "./state/StateService";
export type { StateServiceOptions, RemoteStore } from "./state/StateService";
export { StateProvider, useStateService } from "./state/StateContext";
export { useMemento } from "./state/useMemento";

// Output
export { OutputPanel } from "./output/OutputPanel";
export type { OutputLine, OutputPanelProps } from "./output/OutputPanel";
export { isCollapsible } from "./tree/treeTypes";
export type { TreeNode, FlatNode, TreeItemContext, TreeViewProps, DropPosition } from "./tree/treeTypes";
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
  MenuRadioGroup,
  MenuHeader,
  MenuSeparator,
  Submenu,
  SubmenuItems,
  MenuCommandRef,
  MenuCustom,
} from "./menu/model";
export {
  isAction, isSeparator, isHeader, isSubmenu, isRadioGroup, isCommandRef, isCustom,
} from "./menu/model";
export { parseMnemonic } from "./menu/mnemonic";
export type { ParsedMnemonic } from "./menu/mnemonic";
export { Menu } from "./menu/Menu";
export type { MenuProps } from "./menu/Menu";
export type { MenuSize } from "./menu/MenuRow";
export { MenuList } from "./menu/MenuList";
export { ContextMenu, ContextMenuTrigger, useContextMenu } from "./menu/ContextMenu";
export type {
  ContextMenuProps, ContextMenuTriggerProps, ContextMenuState,
} from "./menu/ContextMenu";

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
export { ShortcutOverlay } from "./command/ShortcutOverlay";
export type { ShortcutOverlayProps } from "./command/ShortcutOverlay";
export { parseChord, matchEvent, formatKeys } from "./command/keybinding";
export type { Chord } from "./command/keybinding";

// Overlay
export { Modal } from "./overlay/Modal";
export type { ModalProps } from "./overlay/Modal";
export { ConfirmDialog } from "./overlay/ConfirmDialog";
export type { ConfirmDialogProps } from "./overlay/ConfirmDialog";
export { ConfirmProvider, useConfirm, useOptionalConfirm } from "./overlay/confirm";
export { PromptProvider, usePrompt, useOptionalPrompt } from "./overlay/prompt";
export type { PromptOptions } from "./overlay/prompt";

// Scheme-aware virtual path (carapace's URI; powers fs mount resolution).
export { VirtualPath } from "./path/VirtualPath";

// Filesystem provider (renderer client; node server + preload helper live in
// "@carapace/shell/node" and "@carapace/shell/ipc").
export { createIpcFs } from "./fs/client";
export type { FsBridge, FsWatchEvent } from "./fs/protocol";
export type { ConfirmOptions, ConfirmResult } from "./overlay/confirm";
export { PromptDialog } from "./overlay/PromptDialog";
export type { PromptDialogProps } from "./overlay/PromptDialog";
export { TypedConfirmDialog } from "./overlay/TypedConfirmDialog";
export type { TypedConfirmDialogProps } from "./overlay/TypedConfirmDialog";
export { ErrorBoundary } from "./overlay/ErrorBoundary";
export { ToastProvider, useToast } from "./overlay/Toast";
export type { ToastTone } from "./overlay/Toast";
export { Tooltip } from "./overlay/Tooltip";
export type { TooltipProps, TooltipPlacement } from "./overlay/Tooltip";
export { Popover } from "./overlay/Popover";
export type { PopoverProps, PopoverPlacement } from "./overlay/Popover";
export { ImageLightbox } from "./overlay/ImageLightbox";
export type { ImageLightboxProps, LightboxImage } from "./overlay/ImageLightbox";
export { ShortcutGuide } from "./overlay/ShortcutGuide";
export type { ShortcutGuideProps, ShortcutItem, ShortcutSection, ShortcutCorner } from "./overlay/ShortcutGuide";

// Viewport / canvas chrome
export { Rulers } from "./viewport/Rulers";
export type { RulersProps } from "./viewport/Rulers";

// Inspector — presentational, data-model-agnostic property editor.
export { Inspector, FieldGrid } from "./inspector/Inspector";
export type {
  InspectorField,
  InspectorProps,
  InspectorSectionInfo,
  InspectorFieldBase,
  NumberField,
  BoolField,
  StringField,
  EnumField,
  ColorField,
  VecField,
  ObjectField,
  ArrayField,
  CustomField,
} from "./inspector/types";
