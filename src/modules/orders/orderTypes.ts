export type OrderStatus = 'paid' | 'partially_returned' | 'returned' | 'cancelled';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
}
