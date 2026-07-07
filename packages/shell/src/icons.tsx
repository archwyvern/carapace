/**
 * Carapace's icon set — Fluent UI System Icons (Regular weight) under semantic names. This is
 * the ONE place meaning → glyph is mapped, so components never hardcode an icon or fall back to
 * ASCII text (no more `✕` / `+` / `↺`). They render as plain inline SVGs: colour follows
 * `currentColor` (set with `text-*`), size via `w-*` / `h-*` (the 16px intrinsic size is
 * overridable). Re-exported from the package root so consumers share the same vocabulary.
 */
export {
  Dismiss16Regular as CloseIcon,
  Add16Regular as AddIcon,
  Subtract16Regular as MinimizeIcon,
  Maximize16Regular as MaximizeIcon,
  ArrowCounterclockwise16Regular as ResetIcon,
  ChevronRight16Regular as ChevronRightIcon,
  ChevronDown16Regular as ChevronDownIcon,
  ChevronUp16Regular as ChevronUpIcon,
  Checkmark16Regular as CheckIcon,
  Info16Regular as InfoIcon,
  Warning16Regular as WarningIcon,
  ErrorCircle16Regular as ErrorIcon,
  Search16Regular as SearchIcon,
  Edit16Regular as EditIcon,
  Link16Regular as LinkIcon,
  LinkDismiss16Regular as UnlinkIcon,
  Delete16Regular as DeleteIcon,
} from "@fluentui/react-icons";
