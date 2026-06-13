export type ChangeKind = "created" | "modified" | "deleted";

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface CarapaceHost {
  window: {
    minimize(): void;
    toggleMaximize(): Promise<void>;
    close(): void;
    isMaximized(): Promise<boolean>;
    onMaximizeChanged(cb: (max: boolean) => void): () => void;
  };
  /**
   * Filesystem adapter. Absent in environments without one (e.g. the browser),
   * which disables filesystem-bound components like `FileExplorer`.
   */
  fs?: {
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    delete(path: string): Promise<void>;
    createFile(path: string, data: string): Promise<void>;
    createDir(path: string): Promise<void>;
    list(path: string): Promise<DirEntry[]>;
    watch(path: string, cb: (path: string, kind: ChangeKind) => void): () => void;
  };
  dialog: {
    openFile(): Promise<string | null>;
    saveFile(): Promise<string | null>;
    message(text: string): Promise<void>;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
  };
}

/**
 * The filesystem-provider shape (`CarapaceHost.fs`, non-optional). Apps supplying a
 * custom provider to `serveFs` / building a host type this as `FileSystemProvider`.
 * Mirrors VS Code's `IFileSystemProvider`.
 */
export type FileSystemProvider = NonNullable<CarapaceHost["fs"]>;
