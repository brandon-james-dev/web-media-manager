import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Resizer from "react-image-file-resizer"
import useFileSystemAccess from "use-fs-access";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function resizePicture(file: Uint8Array, mimeType: string, maxWidth: number = 300, maxHeight: number = 300): Promise<string> {
    return new Promise<string>((resolve) => {
        Resizer.imageFileResizer(
            new Blob([file] as BlobPart[], { type: mimeType }),
            maxWidth,
            maxHeight,
            "JPEG",
            100,
            0,
            (uri) => resolve(uri.toString()),
            "base64"
        );
    }
  )
}