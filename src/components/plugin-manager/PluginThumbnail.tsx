import { Package } from "lucide-react";
import { cn } from "cn";
import { usePluginThumbnail } from "@/hooks";

export interface PluginThumbnailProps {
  /** Installed plugin id; the thumbnail comes from its archive. */
  pluginId: string | undefined;
  className?: string;
}

/**
 * A plugin's declared thumbnail, or a package glyph when it ships none.
 *
 * The bytes are read from the plugin archive and shown through an object URL,
 * so a plugin needs no network access to display an icon. Any image the
 * archive can hold works — PNG, JPEG, WebP, GIF or SVG — because the MIME type
 * comes from the file extension. `object-contain` keeps a non-square logo
 * whole rather than cropping it.
 *
 * @example
 * ```tsx
 * <PluginThumbnail pluginId={plugin.id} className="size-8" />
 * ```
 */
export function PluginThumbnail(props: PluginThumbnailProps) {
  const { pluginId, className } = props;
  const url = usePluginThumbnail(pluginId);

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
        className
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-contain" />
      ) : (
        <Package className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
