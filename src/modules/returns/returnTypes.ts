export type ReturnStatus = 'requested' | 'approved' | 'inspected' | 'refunded' | 'restocked' | 'rejected' | 'closed';
export type InspectionCondition = 'sellable' | 'damaged' | 'missing';

export interface ReturnLine {
  sku: string;
  quantity: number;
  reason: 'wrong_size' | 'defective' | 'changed_mind' | 'shipping_damage';
  approvedQuantity: number;
  inspectedQuantity: number;
  condition?: InspectionCondition;
}

export interface ReturnRequest {
  id: string;
  tenantId: string;
  orderId: string;
  customerId: string;
  status: ReturnStatus;
  lines: ReturnLine[];
  requestedAt: string;
  approvedAt?: string;
  inspectedAt?: string;
  refundedAt?: string;
  restockedAt?: string;
  refundCents: number;
  notes: string[];
}

export interface AuditLog {
  id: string;
  tenantId: string;
  entityId: string;
  action: string;
  message: string;
  createdAt: string;
}
