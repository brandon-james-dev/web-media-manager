/**
 * Run a source refresh while holding a "syncing" flag.
 *
 * The sources page guarded on the flag and cleared it only on success, so one
 * throw left the source permanently marked as syncing and every later click
 * returned early without a word — a silent console and a dead-looking button.
 * The flag is now released on both paths, and a click that is ignored says so.
 */
export interface RunSourceRefreshDeps {
  /** The source id currently marked as syncing, if any. */
  syncingId: string | null;
  sourceId: string;
  sourceName: string;
  onStart: (sourceId: string) => void;
  onFinish: () => void;
  refresh: () => Promise<void>;
  log?: {
    debug: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string, error: unknown) => void;
  };
}

const defaultLog = {
  debug: (message: string) => console.debug(message),
  warn: (message: string) => console.warn(message),
  error: (message: string, error: unknown) => console.error(message, error),
};

/**
 * @returns `true` when the refresh ran, `false` when it was skipped because
 * another source was still marked as syncing.
 */
export async function runSourceRefresh(
  deps: RunSourceRefreshDeps
): Promise<boolean> {
  const log = deps.log ?? defaultLog;

  if (deps.syncingId) {
    log.warn(
      `[Settings] Ignoring refresh of "${deps.sourceName}": ` +
        `"${deps.syncingId}" is still marked as syncing`
    );
    return false;
  }

  deps.onStart(deps.sourceId);
  log.debug(`[Settings] Refreshing source "${deps.sourceName}"...`);

  try {
    await deps.refresh();
    log.debug(`[Settings] Refresh of "${deps.sourceName}" finished`);
    return true;
  } catch (error) {
    log.error(`[Settings] Refresh of "${deps.sourceName}" failed:`, error);
    return true;
  } finally {
    deps.onFinish();
  }
}
