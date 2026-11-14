import { useEffect, useState } from "react";

interface KeySample {
  key: string;
  code: number;
  prevented: boolean;
  at: number;
}

const MAX_SAMPLES = 8;

function isEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("tvdebug") === "1") {
    return true;
  }
  try {
    return window.localStorage.getItem("wmm.tv-debug") === "1";
  } catch {
    return false;
  }
}

/**
 * On-screen log of the key events the page actually receives.
 *
 * A television browser can swallow the remote's D-pad before the page sees it,
 * and there is no way to tell that apart from a handler that never installed
 * without looking at the device. This overlay prints what arrives — the key
 * name, the legacy key code, and whether the handler consumed it — so the
 * question is answered on the television itself rather than guessed at.
 *
 * Enabled with `?tvdebug=1`, or by setting `wmm.tv-debug` to `1` in storage.
 */
export function TvKeyDebug() {
  const [enabled] = useState(isEnabled);
  const [samples, setSamples] = useState<KeySample[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const at = Date.now();
      setSamples((prev) =>
        [
          {
            key: event.key,
            code: event.keyCode,
            prevented: event.defaultPrevented,
            at,
          },
          ...prev,
        ].slice(0, MAX_SAMPLES)
      );
      // Capture runs before the app's handlers, so `defaultPrevented` is still
      // false here. Re-read it on the next task, once the event has finished
      // propagating, to report whether the app actually consumed the key.
      window.setTimeout(() => {
        setSamples((prev) =>
          prev.map((sample) =>
            sample.at === at
              ? { ...sample, prevented: event.defaultPrevented }
              : sample
          )
        );
      }, 0);
    };
    // Capture phase and last, so `prevented` reflects what the app's own
    // handlers decided by the time the event reaches the bubble phase.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-2 right-2 z-200 w-64 rounded-lg bg-black/80 p-2 font-mono text-[11px] leading-tight text-white">
      <p className="mb-1 font-semibold">key events</p>
      {samples.length === 0 ? (
        <p className="text-white/60">none yet — press the remote</p>
      ) : (
        <ul>
          {samples.map((sample) => (
            <li key={sample.at} className="flex justify-between gap-2">
              <span className="truncate">{sample.key}</span>
              <span className="tabular-nums text-white/70">{sample.code}</span>
              <span className={sample.prevented ? "text-emerald-400" : "text-amber-400"}>
                {sample.prevented ? "used" : "free"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
