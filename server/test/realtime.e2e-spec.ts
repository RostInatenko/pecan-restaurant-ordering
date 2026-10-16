import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { ServerMessage } from '@pecan/shared';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { WebSocket } from 'ws';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/** Collects messages as they arrive, so the test can await them one by one. */
function inbox(socket: WebSocket): () => Promise<ServerMessage> {
  const queue: ServerMessage[] = [];
  const waiting: ((message: ServerMessage) => void)[] = [];
  socket.on('message', (data) => {
    const message = JSON.parse((data as Buffer).toString('utf8')) as ServerMessage;
    const resolve = waiting.shift();
    if (resolve) resolve(message);
    else queue.push(message);
  });
  return () => {
    const message = queue.shift();
    return message ? Promise.resolve(message) : new Promise((resolve) => waiting.push(resolve));
  };
}

describe('Realtime (e2e)', () => {
  let app: INestApplication;
  let socket: WebSocket;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    socket = new WebSocket(`ws://localhost:${port}/ws`);
  });

  afterEach(async () => {
    socket.close();
    await app.close();
  });

  it('sends the snapshot on connect, then broadcasts a menu change', async () => {
    const next = inbox(socket);

    const snapshot = await next();
    expect(snapshot.type).toBe('snapshot');
    expect(snapshot.type === 'snapshot' && snapshot.menu.items).toHaveLength(5000);

    await request(app.getHttpServer())
      .patch('/api/items/item-0003')
      .send({ available: false })
      .expect(200);

    expect(await next()).toMatchObject({
      type: 'item.upserted',
      item: { id: 'item-0003', available: false },
    });
  });
});
