"use client";

import { ArrowDown, ImagePlus } from "lucide-react";

type AlbumArtFieldProps = {
  previewArt: string | null;
  labelText?: string;
  dirty: boolean;
  isLoading: boolean;
  onSelectFile: (bytes: Uint8Array) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function AlbumArtField(props: AlbumArtFieldProps) {
  const {
    previewArt,
    labelText,
    dirty,
    isLoading,
    onSelectFile,
    onReset,
    disabled,
  } = props;
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
        className={`
          relative w-32 h-32 rounded border bg-muted 
          flex items-center justify-center overflow-hidden 
          group${!disabled ? " cursor-pointer" : ""}
        `}
      >
        <img
          src={previewArt!}
          alt="Album Art"
          className={`object-cover w-full h-full ${
            dirty ? "border border-blue-400" : ""
          }`}
          hidden={previewArt === null}
        />

        <div
          className="flex flex-col gap-0.5 items-center"
          hidden={previewArt !== null}
        >
          <div className="text-sm text-center text-muted-foreground">
            {labelText || "No Album Art"}
          </div>
          <div hidden={disabled} className="text-xs text-muted-foreground">
            Click to Select
          </div>
        </div>

        <div
          className="
            absolute inset-0 bg-black/40 opacity-0 
            group-hover:opacity-100 transition-opacity 
            flex flex-col items-center justify-center gap-1 text-white text-sm
          "
          hidden={!(!isLoading && !disabled)}
        >
          <ImagePlus />
        </div>

        <div
          className="
            absolute inset-0 bg-black/40
            border border-blue-500
            flex items-center justify-center text-blue-500 text-sm
            "
          hidden={!isLoading}
        >
          <ArrowDown
            className="w-6 h-6 text-blue-400 arrow-down-animate"
            strokeWidth={2}
          />
        </div>
      </label>

      <input
        id="album-art-input"
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        disabled={disabled}
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
