export async function waitForMount(
  rootHandle: FileSystemDirectoryHandle,
  timeoutMs = 10_000
) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      for await (const _ of rootHandle.values()) {
        return true;
      }
    } catch {
      // not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
