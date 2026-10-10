import { useCallback, useRef, type WheelEvent } from "react";
import type { CoverFlowProps } from "./CoverFlowProps";

export function CoverFlow<T>({
  items,
  itemWidth = 220,
  overlap = 180,
  rotation = 60,
  scale = 0.8,
  selectedIndex = 0,
  selectedGap = 110,
  onSelectedIndexChange,
  renderItem,
  renderLabel,
}: CoverFlowProps<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimeoutRef = useRef<number | null>(null);

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollBy({
      left: e.deltaY,
      behavior: "auto",
    });

    e.preventDefault();
  }

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      itemRefs.current.forEach((item, index) => {
        if (!item) {
          return;
        }

        const itemCenter = item.offsetLeft + item.offsetWidth / 2;

        const distance = Math.abs(viewportCenter - itemCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== selectedIndex) {
        onSelectedIndexChange?.(closestIndex);
      }
    }, 40);
  }, [selectedIndex, onSelectedIndexChange]);

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="
        py-4
        flex
        items-center
        overflow-x-auto
        overflow-y-hidden
        snap-x
        snap-mandatory
      "
      style={{
        paddingLeft: `calc(50vw - ${itemWidth / 2}px)`,
        paddingRight: `calc(50vw - ${itemWidth / 2}px)`,
      }}
    >
      {items.map((item, index) => {
        const offset = index - selectedIndex;
        const rotateY = offset === 0 ? 0 : offset < 0 ? rotation : -rotation;
        const itemScale = offset === 0 ? 1 : scale;
        const translateX =
          offset === 0 ? 0 : offset < 0 ? -selectedGap : selectedGap;

        return (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            onClick={handleScroll}
            className="relative shrink-0 mb-10"
            style={{
              width: itemWidth,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex:
                index === selectedIndex
                  ? -1000
                  : -1000 - Math.abs(index - selectedIndex),
              transform: `
                perspective(1200px)
                translateX(${translateX}px)
                rotateY(${rotateY}deg)
                scale(${itemScale})
              `,
              transformStyle: "preserve-3d",
              transition: "transform 250ms ease, z-index 250ms ease",
            }}
          >
            <div className="relative">
              {renderItem(item, index, index === selectedIndex)}
              <div
                className={`
                  absolute
                  left-0
                  top-full
                  w-full
                  overflow-hidden
                  pointer-events-none
                  ${index !== selectedIndex ? "bg-primary-foreground" : ""}
                `}
              >
                <div
                  className="
                    scale-y-[-1]
                    opacity-70
                    mask-[linear-gradient(to_bottom,black,transparent)]
                    [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]
                  "
                >
                  {renderItem(item, index, index === selectedIndex)}
                </div>
              </div>
            </div>
            {renderLabel?.(item, index, index === selectedIndex)}
          </div>
        );
      })}
    </div>
  );
}
