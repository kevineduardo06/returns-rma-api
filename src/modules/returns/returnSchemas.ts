import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPriceCents: z.number().int().nonnegative()
  })).min(1)
});

export const createReturnSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  lines: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
    reason: z.enum(['wrong_size', 'defective', 'changed_mind', 'shipping_damage'])
  })).min(1)
});

export const approveReturnSchema = z.object({
  approvals: z.array(z.object({
    sku: z.string().min(1),
    approvedQuantity: z.number().int().nonnegative()
  })).min(1),
  note: z.string().optional()
});

export const inspectReturnSchema = z.object({
  inspections: z.array(z.object({
    sku: z.string().min(1),
    inspectedQuantity: z.number().int().nonnegative(),
    condition: z.enum(['sellable', 'damaged', 'missing'])
  })).min(1),
  note: z.string().optional()
});
