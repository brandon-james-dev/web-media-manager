import { Subject, filter, type Observable } from "rxjs";
import type {
  WmmCommandName,
  WmmCommandPayload,
  WmmEventName,
  WmmEventPayload,
  WmmMessage,
} from "./taxonomy";
import {
  isWmmCommand,
  isWmmEvent,
  WMM_COMMAND_NAMES,
  WMM_EVENT_NAMES,
} from "./taxonomy";

/**
 * WMM application bus (Step 2).
 *
 * A single typed channel carrying `WmmMessage` (commands + events). It is the
 * cohesive event path:
 *
 *  - emit a command:  `wmmBus.invoke("wmm.playback.togglePause")`
 *  - emit an event:   `wmmBus.publish("wmm.library.song.updated", { songId })`
 *  - subscribe:       `wmmBus.on("wmm.library.song.updated", cb)`
 *
 * Built on RxJS (multicast Subject + filters). The taxonomy is the contract:
 * only names in the registry are valid, and each name's payload is type-checked
 * at the call site. The bus itself is transport-agnostic — a future server or
 * Tauri binding implements the same `WmmMessage` surface over another transport.
 */
class WmmBus {
  private messages = new Subject<WmmMessage>();

  /** The raw message stream (for observers that want every kind). */
  get messages$(): Observable<WmmMessage> {
    return this.messages.asObservable();
  }

  /**
   * Issue a command (a user-initiated "do this"). Validates the name is a
   * known command; unknown names are rejected (the security boundary).
   */
  invoke<C extends WmmCommandName>(
    name: C,
    payload?: WmmCommandPayload[C]
  ): boolean {
    if (!isWmmCommand(name)) return false;

    this.messages.next({
      kind: "command",
      name,
      payload: payload as WmmCommandPayload[C] | undefined,
    });
    return true;
  }

  /**
   * Emit an event (the app reports "this happened"). Validates the name is a
   * known event; unknown names are rejected.
   */
  publish<E extends WmmEventName>(
    name: E,
    payload?: WmmEventPayload[E]
  ): boolean {
    if (!isWmmEvent(name)) return false;

    this.messages.next({
      kind: "event",
      name,
      payload: payload as WmmEventPayload[E] | undefined,
    });
    return true;
  }

  /** Subscribe to a specific command by name. Returns an unsubscribe fn. */
  onCommand<C extends WmmCommandName>(
    name: C,
    handler: (payload?: WmmCommandPayload[C]) => void
  ): () => void {
    const sub = this.messages
      .pipe(
        filter(
          (m): m is Extract<WmmMessage, { kind: "command"; name: C }> =>
            m.kind === "command" && m.name === name
        )
      )
      .subscribe((m) => handler(m.payload as WmmCommandPayload[C] | undefined));

    return () => sub.unsubscribe();
  }

  /**
   * Subscribe to a specific event by name. The handler receives the event
   * and its typed payload. Returns an unsubscribe fn.
   */
  on<E extends WmmEventName>(
    name: E,
    handler: (payload?: WmmEventPayload[E]) => void
  ): () => void {
    const sub = this.messages
      .pipe(
        filter(
          (m): m is Extract<WmmMessage, { kind: "event"; name: E }> =>
            m.kind === "event" && m.name === name
        )
      )
      .subscribe((m) => handler(m.payload as WmmEventPayload[E] | undefined));

    return () => sub.unsubscribe();
  }

  /** Number of current subscribers (exposed for diagnostics). */
  get subscriberCount(): number {
    return this.messages.observers.length;
  }
}

/** Singleton app bus. */
export const wmmBus = new WmmBus();

/** List names currently known (for debug/validation surfaces). */
export { WMM_COMMAND_NAMES, WMM_EVENT_NAMES, isWmmCommand, isWmmEvent };
