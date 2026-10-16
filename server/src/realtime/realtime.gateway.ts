import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway } from '@nestjs/websockets';
import type { ServerMessage } from '@pecan/shared';
import type { Subscription } from 'rxjs';
import { WebSocket } from 'ws';
import { ChaosConfig } from '../chaos/chaos.config.js';
import { MenuService } from '../menu/menu.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { RealtimeEvents } from './realtime-events.js';

export const HEARTBEAT_INTERVAL_MS = 15_000;

/** Compresses messages above 1 KB: the 5,000-item snapshot shrinks from ~810 KB to ~60 KB. */
@WebSocketGateway({ path: '/ws', perMessageDeflate: { threshold: 1024 } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  /** Only clients that already received their snapshot get events. */
  private readonly clients = new Set<WebSocket>();
  private subscription?: Subscription;
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly events: RealtimeEvents,
    private readonly menu: MenuService,
    private readonly orders: OrdersService,
    private readonly chaos: ChaosConfig,
  ) {}

  onModuleInit(): void {
    this.subscription = this.events.events$.subscribe((event) => this.broadcast(event));
    this.timers.push(setInterval(() => this.broadcast({ type: 'ping' }), HEARTBEAT_INTERVAL_MS));
    if (this.chaos.enabled) {
      this.timers.push(setInterval(() => this.dropSomeClients(), this.chaos.socketDropIntervalMs));
    }
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
    this.timers.forEach((timer) => clearInterval(timer));
    this.clients.clear();
  }

  handleConnection(client: WebSocket): void {
    send(client, { type: 'snapshot', menu: this.menu.snapshot(), orders: this.orders.list() });
    this.clients.add(client);
  }

  handleDisconnect(client: WebSocket): void {
    this.clients.delete(client);
  }

  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  /** `terminate()` cuts the socket without a close handshake, like a lost network. */
  private dropSomeClients(): void {
    for (const client of this.clients) {
      if (this.chaos.random() < this.chaos.socketDropRate) client.terminate();
    }
  }
}

function send(client: WebSocket, message: ServerMessage): void {
  client.send(JSON.stringify(message));
}
