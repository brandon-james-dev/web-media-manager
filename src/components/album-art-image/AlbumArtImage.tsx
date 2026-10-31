import { useEffect, useState, useRef } from "react";
import { getJobService } from "@/core/jobs";
import { getPictureOfType } from "@/core/media";
import type { AlbumArtImageProps } from "./AlbumArtImageProps";

export function AlbumArtImage(props: AlbumArtImageProps) {
  const { songId, artworkType, thumbSize, fallback, className } = props;
  const [artwork, setArtwork] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const loadingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Fire the lazy-load only when the element (or its surroundings) is about
  // to enter the viewport, so off-screen artwork is never fetched. A small
  // rootMargin loads it just before it becomes visible (smooth scroll).
  // Unloads artwork when the element stays out of view for 15s (frees memory).
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let outOfViewTimer: ReturnType<typeof setTimeout> | null = null;

    // Load window is relative to the element's own height (2×) rather than a
    // fixed pixel margin, so both the small player art (w-12) and full-width
    // album cards prefetch a proportional lookahead before becoming visible.
    // A zero-height target (e.g. a collapsed box) can never intersect, so
    // fall back to a sensible pixel margin when the element has no height yet.
    const marginPx = Math.max(el.offsetHeight * 2, 300);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (outOfViewTimer) {
              clearTimeout(outOfViewTimer);
              outOfViewTimer = null;
            }
            setInView(true);
          } else {
            // Not visible; start (or reset) the 15s unload window.
            if (outOfViewTimer) clearTimeout(outOfViewTimer);
            outOfViewTimer = setTimeout(() => {
              setInView(false);
            }, 15_000);
          }
        }
      },
      { rootMargin: `${marginPx}px 0px ${marginPx}px 0px` }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (outOfViewTimer) clearTimeout(outOfViewTimer);
    };
  }, []);

  // Load artwork once, once the element is in view
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!songId) {
        setArtwork(null);
        loadingRef.current = false;
        return;
      }

      loadingRef.current = true;

      const picture = await getPictureOfType(
        songId,
        artworkType,
        thumbSize
      );

      if (!cancelled) {
        if (picture) {
          const blob = new Blob([picture.data.slice()]);
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          setArtwork(url);
        } else {
          setArtwork(null);
        }
      }

      loadingRef.current = false;
    }

    if (inView) {
      load();
    } else {
      setArtwork(null);
    }

    return () => {
      cancelled = true;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [songId, artworkType, thumbSize, inView]);

  // Refresh when artwork job completes
  useEffect(() => {
    const eventName = `artwork-complete:${songId}`;

    const unsub = getJobService().onCustom(eventName, async () => {
      if (loadingRef.current) return;
      if (!songId) {
        setArtwork(null);
        loadingRef.current = false;
        return;
      }

      loadingRef.current = true;

      const picture = await getPictureOfType(
        songId,
        artworkType,
        thumbSize
      );

      if (picture) {
        const blob = new Blob([picture.data.slice()]);

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        const url = URL.createObjectURL(blob);

        objectUrlRef.current = url;
        setArtwork(url);
      } else {
        setArtwork(null);
      }

      loadingRef.current = false;
    });

    return () => unsub();
  }, [songId, artworkType, thumbSize]);

  return (
    <div ref={elementRef}>
      {!artwork ? (
        fallback ?? (
          <div className="bg-foreground rounded flex justify-center items-center w-full h-full">
            <span>No artwork</span>
          </div>
        )
      ) : (
        <img
          src={artwork}
          draggable={false}
          className={className ?? "rounded object-cover w-full h-full"}
        />
      )}
    </div>
  );
}
