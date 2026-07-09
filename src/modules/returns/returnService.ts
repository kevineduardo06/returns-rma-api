import { inventoryRepository } from '../inventory/inventoryRepository';
import { orderRepository } from '../orders/orderRepository';
import { badRequest, notFound } from '../../shared/errors';
import { returnRepository } from './returnRepository';
import { InspectionCondition, ReturnRequest } from './returnTypes';

function orderLineQuantity(order: ReturnType<typeof orderRepository.findById>, sku: string): number {
  return order?.items.find(item => item.sku === sku)?.quantity ?? 0;
}

function unitPrice(order: NonNullable<ReturnType<typeof orderRepository.findById>>, sku: string): number {
  return order.items.find(item => item.sku === sku)?.unitPriceCents ?? 0;
}

export const returnService = {
  createReturn(input: {
    tenantId: string;
    orderId: string;
    customerId: string;
    lines: Array<{ sku: string; quantity: number; reason: ReturnRequest['lines'][number]['reason'] }>;
  }): ReturnRequest {
    const order = orderRepository.findById(input.tenantId, input.orderId);
    if (!order) throw notFound('Order not found');
    if (order.customerId !== input.customerId) throw badRequest('Return customer does not match order customer');
    if (order.status === 'cancelled') throw badRequest('Cancelled orders cannot be returned');

    for (const line of input.lines) {
      const purchasedQuantity = orderLineQuantity(order, line.sku);
      if (purchasedQuantity === 0) throw badRequest(`SKU ${line.sku} is not part of the order`);
      if (line.quantity > purchasedQuantity) throw badRequest(`Return quantity for ${line.sku} exceeds purchased quantity`);
    }

    const record = returnRepository.create({
      tenantId: input.tenantId,
      orderId: input.orderId,
      customerId: input.customerId,
      status: 'requested',
      requestedAt: new Date().toISOString(),
      refundCents: 0,
      notes: [],
      lines: input.lines.map(line => ({ ...line, approvedQuantity: 0, inspectedQuantity: 0 }))
    });

    returnRepository.addAudit(input.tenantId, record.id, 'return.requested', 'Return request created');
    return record;
  },

  approveReturn(tenantId: string, returnId: string, approvals: Array<{ sku: string; approvedQuantity: number }>, note?: string): ReturnRequest {
    const record = this.getReturn(tenantId, returnId);
    if (record.status !== 'requested') throw badRequest('Only requested returns can be approved');

    for (const approval of approvals) {
      const line = record.lines.find(item => item.sku === approval.sku);
      if (!line) throw badRequest(`Return line ${approval.sku} not found`);
      if (approval.approvedQuantity > line.quantity) throw badRequest(`Approved quantity for ${approval.sku} exceeds requested quantity`);
      line.approvedQuantity = approval.approvedQuantity;
      inventoryRepository.reserveForInspection(tenantId, approval.sku, approval.approvedQuantity);
    }

    if (record.lines.every(line => line.approvedQuantity === 0)) {
      record.status = 'rejected';
      returnRepository.addAudit(tenantId, record.id, 'return.rejected', 'Return rejected during approval');
    } else {
      record.status = 'approved';
      record.approvedAt = new Date().toISOString();
      returnRepository.addAudit(tenantId, record.id, 'return.approved', 'Return approved for inspection');
    }
    if (note) record.notes.push(note);
    return returnRepository.save(record);
  },

  inspectReturn(
    tenantId: string,
    returnId: string,
    inspections: Array<{ sku: string; inspectedQuantity: number; condition: InspectionCondition }>,
    note?: string
  ): ReturnRequest {
    const record = this.getReturn(tenantId, returnId);
    if (record.status !== 'approved') throw badRequest('Only approved returns can be inspected');

    for (const inspection of inspections) {
      const line = record.lines.find(item => item.sku === inspection.sku);
      if (!line) throw badRequest(`Return line ${inspection.sku} not found`);
      if (inspection.inspectedQuantity > line.approvedQuantity) {
        throw badRequest(`Inspected quantity for ${inspection.sku} exceeds approved quantity`);
      }
      line.inspectedQuantity = inspection.inspectedQuantity;
      line.condition = inspection.condition;
    }

    record.status = 'inspected';
    record.inspectedAt = new Date().toISOString();
    if (note) record.notes.push(note);
    returnRepository.addAudit(tenantId, record.id, 'return.inspected', 'Return inspection completed');
    return returnRepository.save(record);
  },

  refundReturn(tenantId: string, returnId: string): ReturnRequest {
    const record = this.getReturn(tenantId, returnId);
    if (record.status !== 'inspected') throw badRequest('Only inspected returns can be refunded');
    const order = orderRepository.findById(tenantId, record.orderId);
    if (!order) throw notFound('Order not found');

    const refundCents = record.lines.reduce((total, line) => {
      if (line.condition === 'missing') return total;
      return total + line.inspectedQuantity * unitPrice(order, line.sku);
    }, 0);

    record.refundCents = refundCents;
    record.status = 'refunded';
    record.refundedAt = new Date().toISOString();
    orderRepository.updateStatus(tenantId, record.orderId, 'partially_returned');
    returnRepository.addAudit(tenantId, record.id, 'return.refunded', `Refunded ${refundCents} cents`);
    return returnRepository.save(record);
  },

  restockReturn(tenantId: string, returnId: string): ReturnRequest {
    const record = this.getReturn(tenantId, returnId);
    if (record.status !== 'refunded') throw badRequest('Only refunded returns can be restocked');

    for (const line of record.lines) {
      if (line.condition === 'sellable') {
        inventoryRepository.restockSellable(tenantId, line.sku, line.inspectedQuantity);
      } else if (line.condition === 'damaged') {
        inventoryRepository.markDamaged(tenantId, line.sku, line.inspectedQuantity);
      }
    }

    record.status = 'restocked';
    record.restockedAt = new Date().toISOString();
    returnRepository.addAudit(tenantId, record.id, 'return.restocked', 'Return inventory restocked');
    return returnRepository.save(record);
  },

  getReturn(tenantId: string, returnId: string): ReturnRequest {
    const record = returnRepository.findById(tenantId, returnId);
    if (!record) throw notFound('Return not found');
    return record;
  }
};
