import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { resetState } from './testState';

describe('returns RMA API', () => {
  beforeEach(() => resetState());

  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('runs the return lifecycle through HTTP endpoints', async () => {
    const orderResponse = await request(app)
      .post('/tenants/acme/orders')
      .send({ customerId: 'cust_1', items: [{ sku: 'SKU-1', name: 'Jacket', quantity: 1, unitPriceCents: 9000 }] });

    const returnResponse = await request(app)
      .post('/tenants/acme/returns')
      .send({ orderId: orderResponse.body.id, customerId: 'cust_1', lines: [{ sku: 'SKU-1', quantity: 1, reason: 'wrong_size' }] });

    await request(app)
      .post(`/tenants/acme/returns/${returnResponse.body.id}/approve`)
      .send({ approvals: [{ sku: 'SKU-1', approvedQuantity: 1 }] })
      .expect(200);

    await request(app)
      .post(`/tenants/acme/returns/${returnResponse.body.id}/inspect`)
      .send({ inspections: [{ sku: 'SKU-1', inspectedQuantity: 1, condition: 'sellable' }] })
      .expect(200);

    const refundResponse = await request(app)
      .post(`/tenants/acme/returns/${returnResponse.body.id}/refund`)
      .expect(200);

    expect(refundResponse.body.refundCents).toBe(9000);

    const restockResponse = await request(app)
      .post(`/tenants/acme/returns/${returnResponse.body.id}/restock`)
      .expect(200);

    expect(restockResponse.body.status).toBe('restocked');
  });

  it('returns validation errors for invalid payloads', async () => {
    const response = await request(app).post('/tenants/acme/returns').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});
