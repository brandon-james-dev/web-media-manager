export interface CoverFlowProps<T> {
  items: T[];
  itemWidth?: number;
  overlap?: number;
  selectedGap?: number;
  rotation?: number;
  scale?: number;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  renderItem: (item: T, index: number, selected: boolean) => React.ReactNode;
  renderLabel?: (item: T, index: number, selected: boolean) => React.ReactNode;
}
