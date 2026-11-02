import type {
  WmmCommandName,
  WmmCommandPayload,
} from "./taxonomy";
import { wmmBus } from "./bus";

/**
 * WMM command dispatch.
 *
 * Maps command names (from the taxonomy) to their handler functions. The
 * registry is the closed, validated set of things a user can trigger: an
 * `invoke("wmm.playback.togglePause")` only runs if that name has a
 * registered handler, and the payload is type-checked at the call site.
 *
 * Handlers are registered where the behavior lives (providers register
 * playback commands, UI registers view commands, etc.), keeping the wiring
 * co-located with the owning code — while the valid-name set stays central
 * in the taxonomy.
 */
type CommandHandler<N extends WmmCommandName = WmmCommandName> = (
  payload?: WmmCommandPayload[N]
) => void | Promise<void>;

class CommandDispatcher {
  private handlers = new Map<WmmCommandName, CommandHandler>();

  /**
   * Register a handler for a command. Returns an unregister function.
   * Handlers run synchronously or may return a promise.
   */
  register<N extends WmmCommandName>(
    name: N,
    handler: CommandHandler<N>
  ): () => void {
    this.handlers.set(name, handler as CommandHandler);
    return () => {
      if (this.handlers.get(name) === (handler as CommandHandler)) {
        this.handlers.delete(name);
      }
    };
  }

  /**
   * Invoke a command by name with an optional payload. Returns true if a
   * handler ran; false if the name is unknown (register a handler) or not a
   * valid taxonomy name.
   */
  invoke<N extends WmmCommandName>(
    name: N,
    payload?: WmmCommandPayload[N]
  ): boolean {
    const handler = this.handlers.get(name);
    if (!handler) return false;

    // Fire-and-forget: handlers may be async; errors are surfaced to the
    // global error path rather than swallowed silently.
    void Promise.resolve(handler(payload)).catch((err) => {
      console.error(`[wmm] command "${name}" failed:`, err);
    });
    return true;
  }

  /** True if a handler is registered for the given command. */
  has(name: WmmCommandName): boolean {
    return this.handlers.has(name);
  }

  /** Registered command names (for validation/debug surfaces). */
  get registeredNames(): WmmCommandName[] {
    return [...this.handlers.keys()];
  }
}

/** Singleton command dispatcher. */
export const commandDispatcher = new CommandDispatcher();

/**
 * Subscribe the dispatcher to the bus: every command published on the bus is
 * dispatched to its registered handler. Call once at app bootstrap.
 */
export function connectCommandDispatch(): () => void {
  const sub = wmmBus.messages$.subscribe((msg) => {
    if (msg.kind === "command") {
      commandDispatcher.invoke(msg.name, msg.payload);
    }
  });
  return () => sub.unsubscribe();
}
