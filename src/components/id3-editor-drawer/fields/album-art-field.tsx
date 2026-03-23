"use client";

import { ImagePlusIcon, ArrowDownIcon } from "lucide-react";

type Props = {
  previewArt: string | null;
  dirty: boolean;
  isLoading: boolean;
  downloadComplete: boolean;
  onSelectFile: (bytes: Uint8Array) => void;
  onReset: () => void;
};

export function AlbumArtField({
  previewArt,
  dirty,
  isLoading,
  downloadComplete,
  onSelectFile,
  onReset,
}: Props) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-start gap-3 w-full mb-1">
        <span className="text-sm font-medium">Album Art</span>

        <button
          type="button"
          onClick={onReset}
          hidden={!dirty}
          className="text-xs text-blue-600 hover:underline"
        >
          Reset
        </button>
      </div>

      <label
        htmlFor="album-art-input"
        className="
          relative w-32 h-32 rounded border bg-muted 
          flex items-center justify-center overflow-hidden 
          cursor-pointer group
        "
      >
        {previewArt ? (
          <img
            src={previewArt}
            alt="Album Art"
            className={`object-cover w-full h-full ${
              dirty ? "border border-blue-400" : ""
            }`}
          />
        ) : (
          <div className="flex flex-col gap-0.5 items-center">
            <div className="text-sm text-muted-foreground">No Album Art</div>
            <div className="text-xs text-muted-foreground">Click to Select</div>
          </div>
        )}

        {!isLoading && (
          <div
            className="
              absolute inset-0 bg-black/40 opacity-0 
              group-hover:opacity-100 transition-opacity 
              flex items-center justify-center text-white text-sm
            "
          >
            <ImagePlusIcon />
          </div>
        )}

        {isLoading && (
          <div
            className="
              absolute inset-0 bg-black/40
              border border-blue-500
              flex items-center justify-center text-blue-500 text-sm
            "
          >
            <ArrowDownIcon
              className="w-6 h-6 text-blue-400 arrow-down-animate"
              strokeWidth={2}
            />
          </div>
        )}
      </label>

      <input
        id="album-art-input"
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files || !files[0]) return;

          const file = files[0];
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);

          onSelectFile(bytes);
        }}
      />
    </div>
  );
}
