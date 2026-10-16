import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { MenuItem, MenuSnapshot } from '@pecan/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;
  let item: MenuItem;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    const menu = (await request(app.getHttpServer()).get('/api/menu')).body as MenuSnapshot;
    item = menu.items.find((candidate) => candidate.available && !candidate.openPrice)!;
  });

  afterEach(async () => {
    await app.close();
  });

  const placeOrder = (key?: string) => {
    const call = request(app.getHttpServer()).post('/api/orders');
    if (key) call.set('Idempotency-Key', key);
    return call.send({
      lines: [{ itemId: item.id, quantity: 1, unitPrice: item.price }],
      discount: 0,
    });
  };

  it('replays the original order for a repeated key', async () => {
    const first = await placeOrder('retry-key-0001').expect(201);
    const second = await placeOrder('retry-key-0001').expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect((await request(app.getHttpServer()).get('/api/orders')).body).toHaveLength(1);
  });

  it('requires an Idempotency-Key header', async () => {
    const response = await placeOrder().expect(400);
    expect(response.body.code).toBe('VALIDATION');
  });
});
