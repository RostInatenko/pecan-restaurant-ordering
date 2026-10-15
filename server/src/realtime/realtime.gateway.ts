import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocketGateway } from '@nestjs/websockets';
import type { ServerMessage } from '@pecan/shared';
import type { Subscription } from 'rxjs';
import { WebSocket } from 'ws';
import { MenuService } from '../menu/menu.service.js';
import { RealtimeEvents } from './realtime-events.js';

export const HEARTBEAT_INTERVAL_MS = 15_000;

@WebSocketGateway({ path: '/ws' })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  /** Only clients that already received their snapshot get events. */
  private readonly clients = new Set<WebSocket>();
  private subscription?: Subscription;
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private readonly events: RealtimeEvents,
    private readonly menu: MenuService,
  ) {}

  onModuleInit(): void {
    this.subscription = this.events.events$.subscribe((event) => this.broadcast(event));
    this.heartbeat = setInterval(() => this.broadcast({ type: 'ping' }), HEARTBEAT_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
    clearInterval(this.heartbeat);
    this.clients.clear();
  }

  handleConnection(client: WebSocket): void {
    send(client, { type: 'snapshot', menu: this.menu.snapshot(), orders: [] });
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
}

function send(client: WebSocket, message: ServerMessage): void {
  client.send(JSON.stringify(message));
}
