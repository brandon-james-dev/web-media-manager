import { useState, useEffect } from "react";
import { AlbumCard } from "../album-card";
import type { CoverFlowProps } from "./CoverFlowAlbumCardProps";

export function CoverFlowAlbumCard(props: CoverFlowProps) {
  const {
    album,
    index,
    api,
    onClick,
    onDoubleClick,
    overlap = props.overlap ?? 60,
    selectedScale = props.selectedScale ?? 1,
    sideScale = props.sideScale ?? 0.75,
    sideRotation = props.sideRotation ?? 55,
    spacing = props.spacing ?? 60,
    selectedZIndex = props.selectedZIndex ?? 9999,
    zIndexBase = props.zIndexBase ?? 1000,
  } = props;

  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!api) {
      return;
    }

    const update = () => {
      const selectedIndex = api.selectedScrollSnap();
      const diff = index - selectedIndex;

      const scale = diff === 0 ? selectedScale : sideScale;

      const rotateY = diff === 0 ? 0 : diff < 0 ? sideRotation : -sideRotation;

      const translateX =
        diff === 0
          ? 0
          : diff < 0
            ? Math.abs(diff) * spacing - overlap
            : -(Math.abs(diff) * spacing - overlap);

      const zIndex = diff === 0 ? selectedZIndex : zIndexBase - Math.abs(diff);

      setStyle({
        transform: `
          perspective(1200px)
          rotateY(${rotateY}deg)
          translatex(${translateX}px)
          translatez(60px)
          scale(${scale})
        `,
        isolationStyle: "isolate",
        zIndex,
        transition: "all 200ms ease",
      });
    };

    update();
    api.on("select", update);
    api.on("scroll", update);

    return () => {
      api.off("select", update);
      api.off("scroll", update);
    };
  }, [
    api,
    index,
    overlap,
    selectedScale,
    sideScale,
    sideRotation,
    spacing,
    selectedZIndex,
    zIndexBase,
  ]);

  return (
    <div style={style}>
      <div className="relative">
        <AlbumCard
          album={album}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />

        <div
          className="
          absolute
          left-0
          top-full
          mt-1
          scale-y-[-1]
          opacity-30
          mask-[linear-gradient(to_top,black,transparent)]
          [-webkit-mask-image:linear-gradient(to_top,black,transparent)]
          blur
        "
        >
          <AlbumCard album={album} />
        </div>
      </div>
    </div>
  );
}
