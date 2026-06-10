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
  fs: {
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
