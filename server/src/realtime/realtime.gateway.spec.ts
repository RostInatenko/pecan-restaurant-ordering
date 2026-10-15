import type { MenuSnapshot, ServerMessage } from '@pecan/shared';
import { WebSocket } from 'ws';
import type { MenuService } from '../menu/menu.service.js';
import { RealtimeEvents } from './realtime-events.js';
import { HEARTBEAT_INTERVAL_MS, RealtimeGateway } from './realtime.gateway.js';

const menu: MenuSnapshot = { categories: [], items: [] };

function fakeClient() {
  const send = vi.fn<(data: string) => void>();
  const client = { readyState: WebSocket.OPEN, send } as unknown as WebSocket;
  const received = (): ServerMessage[] => send.mock.calls.map(([data]) => JSON.parse(data));
  return { client, received };
}

describe('RealtimeGateway', () => {
  let events: RealtimeEvents;
  let gateway: RealtimeGateway;

  beforeEach(() => {
    vi.useFakeTimers();
    events = new RealtimeEvents();
    gateway = new RealtimeGateway(events, { snapshot: () => menu } as unknown as MenuService);
    gateway.onModuleInit();
  });

  afterEach(() => {
    gateway.onModuleDestroy();
    vi.useRealTimers();
  });

  it('sends a snapshot first, then the events that follow', () => {
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    events.publish({ type: 'item.deleted', id: 'item-0001' });

    expect(received()).toEqual([
      { type: 'snapshot', menu, orders: [] },
      { type: 'item.deleted', id: 'item-0001' },
    ]);
  });

  it('sends a ping on every heartbeat', () => {
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

    expect(received().filter((message) => message.type === 'ping')).toHaveLength(2);
  });

  it('stops sending to a client after it disconnects', () => {
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    gateway.handleDisconnect(client);
    events.publish({ type: 'item.deleted', id: 'item-0001' });

    expect(received()).toHaveLength(1);
  });
});
