import { beforeEach, describe, expect, it } from 'vitest';
import { inventoryRepository } from '../src/modules/inventory/inventoryRepository';
import { orderService } from '../src/modules/orders/orderService';
import { returnRepository } from '../src/modules/returns/returnRepository';
import { returnService } from '../src/modules/returns/returnService';
import { reportService } from '../src/modules/reports/reportService';
import { resetState } from './testState';

const tenantId = 'tenant_a';

function createOrder() {
  return orderService.createOrder(tenantId, 'cust_1', [
    { sku: 'SKU-1', name: 'Running Shoes', quantity: 2, unitPriceCents: 12900 },
    { sku: 'SKU-2', name: 'Socks', quantity: 1, unitPriceCents: 1500 }
  ]);
}

describe('returnService', () => {
  beforeEach(() => resetState());

  it('creates a return for items that belong to the order', () => {
    const order = createOrder();

    const record = returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [{ sku: 'SKU-1', quantity: 1, reason: 'wrong_size' }]
    });

    expect(record.status).toBe('requested');
    expect(record.lines[0].approvedQuantity).toBe(0);
    expect(returnRepository.listAudit(tenantId, record.id)).toHaveLength(1);
  });

  it('rejects return quantities greater than the purchased quantity', () => {
    const order = createOrder();

    expect(() => returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [{ sku: 'SKU-1', quantity: 3, reason: 'wrong_size' }]
    })).toThrow('exceeds purchased quantity');
  });

  it('approves a return and reserves inventory for inspection', () => {
    const order = createOrder();
    const record = returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [{ sku: 'SKU-1', quantity: 2, reason: 'defective' }]
    });

    const approved = returnService.approveReturn(tenantId, record.id, [{ sku: 'SKU-1', approvedQuantity: 1 }]);

    expect(approved.status).toBe('approved');
    expect(inventoryRepository.get(tenantId, 'SKU-1')?.reservedForInspection).toBe(1);
  });

  it('moves fully unapproved returns to rejected', () => {
    const order = createOrder();
    const record = returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [{ sku: 'SKU-1', quantity: 1, reason: 'changed_mind' }]
    });

    const rejected = returnService.approveReturn(tenantId, record.id, [{ sku: 'SKU-1', approvedQuantity: 0 }]);

    expect(rejected.status).toBe('rejected');
    expect(returnRepository.listAudit(tenantId, record.id).map(log => log.action)).toContain('return.rejected');
  });

  it('calculates refunds only from inspected non-missing quantities', () => {
    const order = createOrder();
    const record = returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [
        { sku: 'SKU-1', quantity: 2, reason: 'defective' },
        { sku: 'SKU-2', quantity: 1, reason: 'shipping_damage' }
      ]
    });

    returnService.approveReturn(tenantId, record.id, [
      { sku: 'SKU-1', approvedQuantity: 2 },
      { sku: 'SKU-2', approvedQuantity: 1 }
    ]);
    returnService.inspectReturn(tenantId, record.id, [
      { sku: 'SKU-1', inspectedQuantity: 1, condition: 'damaged' },
      { sku: 'SKU-2', inspectedQuantity: 1, condition: 'missing' }
    ]);
    const refunded = returnService.refundReturn(tenantId, record.id);

    expect(refunded.refundCents).toBe(12900);
    expect(orderService.getOrder(tenantId, order.id).status).toBe('partially_returned');
  });

  it('restocks sellable items but tracks damaged items separately', () => {
    const order = createOrder();
    const record = returnService.createReturn({
      tenantId,
      orderId: order.id,
      customerId: 'cust_1',
      lines: [
        { sku: 'SKU-1', quantity: 1, reason: 'wrong_size' },
        { sku: 'SKU-2', quantity: 1, reason: 'defective' }
      ]
    });

    returnService.approveReturn(tenantId, record.id, [
      { sku: 'SKU-1', approvedQuantity: 1 },
      { sku: 'SKU-2', approvedQuantity: 1 }
    ]);
    returnService.inspectReturn(tenantId, record.id, [
      { sku: 'SKU-1', inspectedQuantity: 1, condition: 'sellable' },
      { sku: 'SKU-2', inspectedQuantity: 1, condition: 'damaged' }
    ]);
    returnService.refundReturn(tenantId, record.id);
    const restocked = returnService.restockReturn(tenantId, record.id);

    expect(restocked.status).toBe('restocked');
    expect(inventoryRepository.get(tenantId, 'SKU-1')?.available).toBe(1);
    expect(inventoryRepository.get(tenantId, 'SKU-2')?.damaged).toBe(1);
  });

  it('keeps reports isolated by tenant', () => {
    const orderA = createOrder();
    const orderB = orderService.createOrder('tenant_b', 'cust_b', [
      { sku: 'SKU-B', name: 'Bag', quantity: 1, unitPriceCents: 5000 }
    ]);

    returnService.createReturn({ tenantId, orderId: orderA.id, customerId: 'cust_1', lines: [{ sku: 'SKU-1', quantity: 1, reason: 'wrong_size' }] });
    returnService.createReturn({ tenantId: 'tenant_b', orderId: orderB.id, customerId: 'cust_b', lines: [{ sku: 'SKU-B', quantity: 1, reason: 'changed_mind' }] });

    expect(reportService.returnsSummary(tenantId).totalReturns).toBe(1);
    expect(reportService.returnsSummary('tenant_b').totalReturns).toBe(1);
  });
});
