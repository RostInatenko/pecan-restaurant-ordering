import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Menu API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/menu returns the catalogue', async () => {
    const response = await request(app.getHttpServer()).get('/api/menu').expect(200);
    expect(response.body.items).toHaveLength(5000);
  });

  it('rejects an invalid item with a VALIDATION body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/items')
      .send({ name: '', price: 12.5, extra: true })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION');
  });

  it('PATCH changes only the sent fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/items/item-0002')
      .send({ available: false })
      .expect(200);
    expect(response.body).toMatchObject({ id: 'item-0002', available: false });
    expect(response.body.name).toBeTruthy();
  });
});
