export const isMac =
  typeof window !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);
