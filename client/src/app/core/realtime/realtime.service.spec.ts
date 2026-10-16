import { TestBed } from '@angular/core/testing';
import type { ServerMessage } from '@pecan/shared';
import { Subject } from 'rxjs';
import type { WebSocketSubjectConfig } from 'rxjs/webSocket';
import {
  HEARTBEAT_TIMEOUT_MS,
  RealtimeService,
  WEB_SOCKET_FACTORY,
  backoffDelay,
} from './realtime.service';
import type { RealtimeEvent } from './realtime.service';

/** Stands in for `webSocket()`: each connection attempt gets a Subject the test controls. */
function setup() {
  const sockets: Subject<ServerMessage>[] = [];
  const configs: WebSocketSubjectConfig<ServerMessage>[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: WEB_SOCKET_FACTORY,
        useValue: (config: WebSocketSubjectConfig<ServerMessage>) => {
          const socket = new Subject<ServerMessage>();
          sockets.push(socket);
          configs.push(config);
          return socket;
        },
      },
    ],
  });
  const events: RealtimeEvent[] = [];
  const subscription = TestBed.inject(RealtimeService)
    .connect()
    .subscribe((event) => events.push(event));
  const open = (index: number) => configs[index].openObserver?.next(new Event('open'));
  return { sockets, configs, events, open, subscription };
}

describe('backoffDelay', () => {
  it('doubles per attempt with jitter and caps at 30 seconds', () => {
    expect(backoffDelay(0, () => 1)).toBe(1000);
    expect(backoffDelay(0, () => 0)).toBe(500);
    expect(backoffDelay(3, () => 1)).toBe(8000);
    expect(backoffDelay(10, () => 1)).toBe(30_000);
  });
});

describe('RealtimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports the connection opening and forwards messages', () => {
    const { sockets, events, open, subscription } = setup();
    open(0);
    sockets[0].next({ type: 'ping' });

    expect(events).toEqual([
      { type: 'connecting', attempt: 0 },
      { type: 'open' },
      { type: 'message', message: { type: 'ping' } },
    ]);
    subscription.unsubscribe();
  });

  it('reconnects with backoff after the socket fails', () => {
    const { sockets, events, open, subscription } = setup();
    open(0);
    sockets[0].error(new Error('connection reset'));

    expect(events.at(-1)).toEqual({ type: 'closed', retryInMs: 1000 });
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    expect(events.at(-1)).toEqual({ type: 'connecting', attempt: 1 });
    subscription.unsubscribe();
  });

  it('backs off further on repeated failures and resets after a successful open', () => {
    const { sockets, events, open, subscription } = setup();
    sockets[0].error(new Error('down'));
    vi.advanceTimersByTime(1000);
    sockets[1].error(new Error('still down'));
    expect(events.at(-1)).toEqual({ type: 'closed', retryInMs: 2000 });

    vi.advanceTimersByTime(2000);
    open(2);
    sockets[2].error(new Error('dropped'));
    expect(events.at(-1)).toEqual({ type: 'closed', retryInMs: 1000 });
    subscription.unsubscribe();
  });

  it('treats a clean close like a drop', () => {
    const { sockets, events, open, subscription } = setup();
    open(0);
    sockets[0].complete();
    expect(events.at(-1)).toEqual({ type: 'closed', retryInMs: 1000 });
    subscription.unsubscribe();
  });

  it('gives up on a connection that stays silent past the heartbeat timeout', () => {
    const { events, open, subscription } = setup();
    open(0);
    vi.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS);
    expect(events.at(-1)).toEqual({ type: 'closed', retryInMs: 1000 });
    subscription.unsubscribe();
  });

  it('reconnects at once when the browser comes back online', () => {
    const { sockets, subscription } = setup();
    sockets[0].error(new Error('offline'));
    window.dispatchEvent(new Event('online'));
    expect(sockets).toHaveLength(2);
    subscription.unsubscribe();
  });
});
