import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Id3FormValues } from "@/models";
import type { ICommonTagsResult } from "music-metadata";
import { TAG_MAP } from "./tagMap";
import Resizer from "react-image-file-resizer"

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

export function mapCommonTagsToId3FormValues(
  tags: ICommonTagsResult
): Partial<Id3FormValues> {
  const result: Partial<Id3FormValues> = {};

  for (const key in TAG_MAP) {
    const formKey = key as keyof Id3FormValues;
    const tagKey = TAG_MAP[formKey];

    if (!tagKey) continue; // handled manually or intentionally skipped

    const value = tags[tagKey];

    if (value == null) continue;

    // Normalize arrays → first element
    if (Array.isArray(value)) {
      result[formKey] = String(value[0] ?? "");
    } else {
      result[formKey] = String(value);
    }
  }

  // Track number (e.g., { no: 3, of: 12 })
  if (tags.track) {
    const { no, of } = tags.track;
    result.track = [no, of].filter(Boolean).join("/") || "";
  }

  // Disc number (e.g., { no: 1, of: 2 })
  if (tags.disk) {
    const { no, of } = tags.disk;
    result.disc = [no, of].filter(Boolean).join("/") || "";
  }

  return result;
}