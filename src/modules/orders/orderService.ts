import { badRequest, notFound } from '../../shared/errors';
import { orderRepository } from './orderRepository';
import { Order, OrderItem } from './orderTypes';

export const orderService = {
  createOrder(tenantId: string, customerId: string, items: OrderItem[]): Order {
    if (!tenantId.trim()) throw badRequest('tenantId is required');
    if (!customerId.trim()) throw badRequest('customerId is required');
    return orderRepository.create({ tenantId, customerId, items });
  },

  getOrder(tenantId: string, orderId: string): Order {
    const order = orderRepository.findById(tenantId, orderId);
    if (!order) throw notFound('Order not found');
    return order;
  }
};
