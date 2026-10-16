import type { MenuSnapshot, ServerMessage } from '@pecan/shared';
import { WebSocket } from 'ws';
import type { ChaosConfig } from '../chaos/chaos.config.js';
import type { MenuService } from '../menu/menu.service.js';
import type { OrdersService } from '../orders/orders.service.js';
import { RealtimeEvents } from './realtime-events.js';
import { HEARTBEAT_INTERVAL_MS, RealtimeGateway } from './realtime.gateway.js';

const menu: MenuSnapshot = { categories: [], items: [] };

function fakeClient() {
  const send = vi.fn<(data: string) => void>();
  const terminate = vi.fn();
  const client = { readyState: WebSocket.OPEN, send, terminate } as unknown as WebSocket;
  const received = (): ServerMessage[] => send.mock.calls.map(([data]) => JSON.parse(data));
  return { client, received, terminate };
}

describe('RealtimeGateway', () => {
  let events: RealtimeEvents;
  let gateway: RealtimeGateway;

  const createGateway = (chaos: Partial<ChaosConfig> = { enabled: false }) => {
    gateway = new RealtimeGateway(
      events,
      { snapshot: () => menu } as unknown as MenuService,
      { list: () => [] } as unknown as OrdersService,
      chaos as ChaosConfig,
    );
    gateway.onModuleInit();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    events = new RealtimeEvents();
  });

  afterEach(() => {
    gateway.onModuleDestroy();
    vi.useRealTimers();
  });

  it('sends a snapshot first, then the events that follow', () => {
    createGateway();
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    events.publish({ type: 'item.deleted', id: 'item-0001' });

    expect(received()).toEqual([
      { type: 'snapshot', menu, orders: [] },
      { type: 'item.deleted', id: 'item-0001' },
    ]);
  });

  it('sends a ping on every heartbeat', () => {
    createGateway();
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

    expect(received().filter((message) => message.type === 'ping')).toHaveLength(2);
  });

  it('stops sending to a client after it disconnects', () => {
    createGateway();
    const { client, received } = fakeClient();
    gateway.handleConnection(client);
    gateway.handleDisconnect(client);
    events.publish({ type: 'item.deleted', id: 'item-0001' });

    expect(received()).toHaveLength(1);
  });

  it('drops connections in chaos mode', () => {
    createGateway({
      enabled: true,
      socketDropIntervalMs: 1000,
      socketDropRate: 1,
      random: () => 0,
    });
    const { client, terminate } = fakeClient();
    gateway.handleConnection(client);
    vi.advanceTimersByTime(1000);

    expect(terminate).toHaveBeenCalled();
  });
});
