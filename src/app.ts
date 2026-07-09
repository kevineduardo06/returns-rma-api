import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { AppError } from './shared/errors';
import { inventoryRepository } from './modules/inventory/inventoryRepository';
import { orderService } from './modules/orders/orderService';
import { returnRepository } from './modules/returns/returnRepository';
import { approveReturnSchema, createOrderSchema, createReturnSchema, inspectReturnSchema } from './modules/returns/returnSchemas';
import { returnService } from './modules/returns/returnService';
import { reportService } from './modules/reports/reportService';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/tenants/:tenantId/orders', (req, res, next) => {
  try {
    const payload = createOrderSchema.parse(req.body);
    const order = orderService.createOrder(req.params.tenantId, payload.customerId, payload.items);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

app.get('/tenants/:tenantId/orders/:orderId', (req, res, next) => {
  try {
    res.json(orderService.getOrder(req.params.tenantId, req.params.orderId));
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:tenantId/inventory', (req, res) => {
  const item = inventoryRepository.upsert({
    tenantId: req.params.tenantId,
    sku: String(req.body.sku),
    available: Number(req.body.available ?? 0),
    reservedForInspection: Number(req.body.reservedForInspection ?? 0),
    damaged: Number(req.body.damaged ?? 0)
  });
  res.status(201).json(item);
});

app.get('/tenants/:tenantId/inventory/:sku', (req, res) => {
  res.json(inventoryRepository.get(req.params.tenantId, req.params.sku) ?? null);
});

app.post('/tenants/:tenantId/returns', (req, res, next) => {
  try {
    const payload = createReturnSchema.parse(req.body);
    const record = returnService.createReturn({ tenantId: req.params.tenantId, ...payload });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:tenantId/returns/:returnId/approve', (req, res, next) => {
  try {
    const payload = approveReturnSchema.parse(req.body);
    res.json(returnService.approveReturn(req.params.tenantId, req.params.returnId, payload.approvals, payload.note));
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:tenantId/returns/:returnId/inspect', (req, res, next) => {
  try {
    const payload = inspectReturnSchema.parse(req.body);
    res.json(returnService.inspectReturn(req.params.tenantId, req.params.returnId, payload.inspections, payload.note));
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:tenantId/returns/:returnId/refund', (req, res, next) => {
  try {
    res.json(returnService.refundReturn(req.params.tenantId, req.params.returnId));
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:tenantId/returns/:returnId/restock', (req, res, next) => {
  try {
    res.json(returnService.restockReturn(req.params.tenantId, req.params.returnId));
  } catch (error) {
    next(error);
  }
});

app.get('/tenants/:tenantId/returns/:returnId', (req, res, next) => {
  try {
    res.json(returnService.getReturn(req.params.tenantId, req.params.returnId));
  } catch (error) {
    next(error);
  }
});

app.get('/tenants/:tenantId/returns/:returnId/audit', (req, res) => {
  res.json(returnRepository.listAudit(req.params.tenantId, req.params.returnId));
});

app.get('/tenants/:tenantId/reports/returns-summary', (req, res) => {
  res.json(reportService.returnsSummary(req.params.tenantId));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    res.status(400).json({ error: 'Validation failed', details: (error as { issues: unknown }).issues });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});
