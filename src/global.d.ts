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

interface USBDevice {
  readonly vendorId: number;
  readonly productId: number;

  readonly manufacturerName?: string;
  readonly productName?: string;
  readonly serialNumber?: string;
}

interface USBEndpoint {
  readonly direction: "in" | "out";

  readonly endpointNumber: number;

  readonly packetSize: number;

  readonly type: "bulk" | "interrupt" | "isochronous";
}

interface USBAlternateInterface {
  readonly alternateSetting: number;

  readonly interfaceClass: number;

  readonly interfaceSubclass: number;

  readonly interfaceProtocol: number;

  readonly interfaceName: string | null;

  readonly endpoints: USBEndpoint[];
}

interface USBInterface {
  readonly interfaceNumber: number;

  readonly claimed: boolean;

  readonly alternate: USBAlternateInterface;

  readonly alternates: USBAlternateInterface[];
}

interface USBConfiguration {
  readonly configurationValue: number;

  readonly configurationName: string | null;

  readonly interfaces: USBInterface[];
}

interface USBDevice {
  readonly vendorId: number;

  readonly productId: number;

  readonly manufacturerName: string | null;

  readonly productName: string | null;

  readonly serialNumber: string | null;

  readonly usbVersionMajor: number;
  readonly usbVersionMinor: number;
  readonly usbVersionSubminor: number;

  readonly deviceVersionMajor: number;
  readonly deviceVersionMinor: number;
  readonly deviceVersionSubminor: number;

  readonly deviceClass: number;
  readonly deviceSubclass: number;
  readonly deviceProtocol: number;

  readonly opened: boolean;

  readonly configuration: USBConfiguration | null;

  readonly configurations: USBConfiguration[];

  open(): Promise<void>;

  close(): Promise<void>;

  selectConfiguration(configurationValue: number): Promise<void>;

  claimInterface(interfaceNumber: number): Promise<void>;

  releaseInterface(interfaceNumber: number): Promise<void>;
}

interface USB {
  requestDevice(options: {
    filters: Array<{
      vendorId?: number;
      productId?: number;
      classCode?: number;
      deviceClass?: number;
      subclassCode?: number;
      protocolCode?: number;
      serialNumber?: string;
    }>;
  }): Promise<USBDevice>;

  getDevices(): Promise<USBDevice[]>;
}

interface Navigator {
  readonly usb: USB;
}
