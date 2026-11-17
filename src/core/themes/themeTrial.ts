/**
 * How long a newly applied theme stays on trial before it reverts on its own.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * `Reverting in ${THEME_TRIAL_SECONDS} s`;
 * ```
 */
export const THEME_TRIAL_SECONDS = 15;

/**
 * A running theme trial. `undefined` ids mean the built-in theme.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const state: ThemeTrialState = {
 *   themeId: "classic-blue",
 *   previousId: undefined,
 *   secondsLeft: 15,
 * };
 * ```
 */
export interface ThemeTrialState {
  readonly themeId: string | undefined;
  readonly previousId: string | undefined;
  readonly secondsLeft: number;
}

/**
 * Restores the previous theme when a trial is reverted or runs out.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const revert: ThemeTrialRevert = (previousId) =>
 *   manager.setActiveThemeId(previousId);
 * ```
 */
export type ThemeTrialRevert = (
  previousId: string | undefined
) => void | Promise<void>;

/**
 * Timer functions, injectable so tests can drive the countdown.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * new ThemeTrial({ setInterval: fakeSetInterval, clearInterval: fakeClear });
 * ```
 */
export interface ThemeTrialTimers {
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

/**
 * The 15-second "Keep this theme?" trial after a theme is applied. Without
 * {@link ThemeTrial.keep}, it calls the revert callback when the countdown
 * reaches zero. Subscribe with {@link ThemeTrial.subscribe} and read
 * {@link ThemeTrial.getSnapshot}, which is `undefined` when no trial runs.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * themeTrial.start("classic-blue", undefined, (previousId) =>
 *   manager.setActiveThemeId(previousId)
 * );
 * themeTrial.keep();
 * ```
 */
export class ThemeTrial {
  private readonly timers: ThemeTrialTimers;
  private readonly listeners = new Set<() => void>();
  private state: ThemeTrialState | undefined;
  private revertTo: ThemeTrialRevert | undefined;
  private handle: unknown;

  constructor(timers?: ThemeTrialTimers) {
    this.timers = timers ?? {
      setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
      clearInterval: (handle) =>
        globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
    };
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): ThemeTrialState | undefined => this.state;

  start(
    themeId: string | undefined,
    previousId: string | undefined,
    revert: ThemeTrialRevert
  ): void {
    this.stop();
    this.revertTo = revert;
    this.update({ themeId, previousId, secondsLeft: THEME_TRIAL_SECONDS });
    this.handle = this.timers.setInterval(() => this.tick(), 1000);
  }

  keep(): void {
    this.stop();
    this.update(undefined);
  }

  async revert(): Promise<void> {
    const state = this.state;
    const revert = this.revertTo;
    this.stop();
    this.update(undefined);
    if (state !== undefined && revert !== undefined) {
      await revert(state.previousId);
    }
  }

  private tick(): void {
    if (this.state === undefined) return;
    const secondsLeft = this.state.secondsLeft - 1;
    if (secondsLeft <= 0) {
      void this.revert();
      return;
    }
    this.update({ ...this.state, secondsLeft });
  }

  private stop(): void {
    if (this.handle !== undefined) this.timers.clearInterval(this.handle);
    this.handle = undefined;
    this.revertTo = undefined;
  }

  private update(state: ThemeTrialState | undefined): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

/**
 * The app-wide theme trial shown by the trial bar.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * useSyncExternalStore(themeTrial.subscribe, themeTrial.getSnapshot);
 * ```
 */
export const themeTrial = new ThemeTrial();
