declare namespace React {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

interface Window {
  showOpenFilePicker?: (
    options?: OpenFilePickerOptions
  ) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: (
    options?: DirectoryPickerOptions
  ) => Promise<FileSystemDirectoryHandle>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
  excludeAcceptAllOption?: boolean;
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: FileSystemHandle;
}

interface FileSystemHandle {
  queryPermission(
    options?: FileSystemPermissionDescriptor
  ): Promise<PermissionState>;
  requestPermission(
    options?: FileSystemPermissionDescriptor
  ): Promise<PermissionState>;
}

interface FileSystemPermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  createWritable(options?: {
    keepExistingData?: boolean;
  }): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}
