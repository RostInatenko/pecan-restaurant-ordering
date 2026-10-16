import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import type { ServerMessage } from '@pecan/shared';
import {
  Subject,
  concatWith,
  defer,
  fromEvent,
  map,
  merge,
  race,
  retry,
  take,
  throwError,
  timeout,
  timer,
} from 'rxjs';
import type { Observable } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import type { WebSocketSubjectConfig } from 'rxjs/webSocket';

export type RealtimeEvent =
  | { type: 'connecting'; attempt: number }
  | { type: 'open' }
  | { type: 'message'; message: ServerMessage }
  | { type: 'closed'; retryInMs: number }
  | { type: 'offline' };

/** The server pings every 15 s; this much silence means the connection is dead. */
export const HEARTBEAT_TIMEOUT_MS = 35_000;
const MAX_BACKOFF_MS = 30_000;

/** Exponential backoff with jitter: 1 s, 2 s, 4 s … capped at 30 s, each randomised to 50–100%. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}

export type WebSocketFactory = (
  config: WebSocketSubjectConfig<ServerMessage>,
) => Observable<ServerMessage>;

/** Swappable so tests can drive the socket without a server. */
export const WEB_SOCKET_FACTORY = new InjectionToken<WebSocketFactory>('WEB_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => webSocket,
});

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly createSocket = inject(WEB_SOCKET_FACTORY);
  private readonly window = inject(DOCUMENT).defaultView as Window;

  /**
   * One long-lived stream: connection lifecycle events plus every server message. Reconnects
   * forever; each new connection starts with a fresh snapshot from the server, so nothing that
   * happened while disconnected can be missed.
   */
  connect(): Observable<RealtimeEvent> {
    return defer(() => {
      const lifecycle = new Subject<RealtimeEvent>();
      let attempt = 0;

      const messages = defer(() => {
        lifecycle.next({ type: 'connecting', attempt });
        return this.createSocket({
          url: socketUrl(this.window.location),
          openObserver: {
            next: () => {
              attempt = 0;
              lifecycle.next({ type: 'open' });
            },
          },
        });
      }).pipe(
        timeout({ each: HEARTBEAT_TIMEOUT_MS }),
        // A clean close completes the socket stream; turn it into an error so `retry` handles it.
        concatWith(throwError(() => new Error('WebSocket closed'))),
        retry({
          delay: () => {
            const retryInMs = backoffDelay(attempt);
            attempt += 1;
            lifecycle.next({ type: 'closed', retryInMs });
            return race(timer(retryInMs), fromEvent(this.window, 'online').pipe(take(1)));
          },
        }),
        map((message): RealtimeEvent => ({ type: 'message', message })),
      );

      const offline = fromEvent(this.window, 'offline').pipe(
        map((): RealtimeEvent => ({ type: 'offline' })),
      );

      return merge(lifecycle, offline, messages);
    });
  }
}

function socketUrl(location: Location): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
