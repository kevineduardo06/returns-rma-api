import { createId } from '../../shared/id';
import { Order, OrderItem, OrderStatus } from './orderTypes';

const orders = new Map<string, Order>();

export const orderRepository = {
  create(input: { tenantId: string; customerId: string; items: OrderItem[] }): Order {
    const order: Order = {
      id: createId('ord'),
      tenantId: input.tenantId,
      customerId: input.customerId,
      items: input.items,
      status: 'paid',
      createdAt: new Date().toISOString()
    };
    orders.set(order.id, order);
    return order;
  },

  findById(tenantId: string, id: string): Order | undefined {
    const order = orders.get(id);
    return order?.tenantId === tenantId ? order : undefined;
  },

  updateStatus(tenantId: string, id: string, status: OrderStatus): Order | undefined {
    const order = this.findById(tenantId, id);
    if (!order) return undefined;
    order.status = status;
    return order;
  },

  clear(): void {
    orders.clear();
  }
};
