import { Info } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { Song } from "@/models";
import { formatTrackDuration } from "@/lib/format";
import { formatBytes } from "@/lib/format";
import { useTranslation } from "@/i18n";

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;

  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

/** Read-only view of the fields the album editor's track rows do not show. */
export function TrackInfoPopover({ song }: { song: Song }) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            type="button"
            aria-label={t("metadata.info")}
            title={t("metadata.info")}
          >
            <Info />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <div className="font-medium">{t("metadata.trackInfo")}</div>

        <div className="flex flex-col gap-1 text-xs">
          <Row label={t("metadata.fileName")} value={song.filename} />
          <Row label={t("metadata.filePath")} value={song.relativePath} />
          <Row
            label={t("metadata.fileSize")}
            value={song.filesize ? formatBytes(song.filesize) : undefined}
          />
          <Row
            label={t("metadata.duration")}
            value={formatTrackDuration(song.duration)}
          />
          <Row
            label={t("metadata.bitrate")}
            value={
              song.bitrate === undefined
                ? undefined
                : `${Math.round(song.bitrate)} kbps`
            }
          />
          <Row
            label={t("metadata.sampleRate")}
            value={song.sampleRate ? `${song.sampleRate} Hz` : undefined}
          />
          <Row label={t("metadata.channels")} value={song.channels} />
          <Row label={t("metadata.codec")} value={song.codec} />
          <Row label={t("metadata.container")} value={song.containerFormat} />
          <Row
            label={t("metadata.lossless")}
            value={
              song.isLossless === undefined
                ? undefined
                : song.isLossless
                  ? t("common.yes")
                  : t("common.no")
            }
          />
          <Row label={t("metadata.albumArtist")} value={song.albumArtist} />
          <Row label={t("metadata.disc")} value={song.discNumber} />
          <Row label={t("metadata.genre")} value={song.genre} />
          <Row label={t("metadata.year")} value={song.year} />
          <Row label={t("metadata.composer")} value={song.composer} />
          <Row
            label={t("metadata.added")}
            value={
              song.addedAt
                ? new Date(song.addedAt).toLocaleDateString()
                : undefined
            }
          />
          <Row
            label={t("metadata.updated")}
            value={
              song.updatedAt
                ? new Date(song.updatedAt).toLocaleDateString()
                : undefined
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
