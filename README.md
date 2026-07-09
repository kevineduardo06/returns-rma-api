# Returns RMA API

A TypeScript/Express Greenfield project for managing return merchandise authorization (RMA) workflows.

## Domain

The API models a realistic post-order returns workflow:

- Customers belong to tenants.
- Orders contain purchased items.
- Inventory tracks available, reserved, and damaged quantities.
- Return requests move through request, approval, inspection, refund, restock, rejection, and closure steps.
- Audit logs capture important return lifecycle events.
- Reports summarize refund exposure and inspection outcomes.

## Commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Useful endpoints

```http
GET /health
POST /tenants/:tenantId/orders
GET /tenants/:tenantId/orders/:orderId
POST /tenants/:tenantId/returns
POST /tenants/:tenantId/returns/:returnId/approve
POST /tenants/:tenantId/returns/:returnId/inspect
POST /tenants/:tenantId/returns/:returnId/refund
POST /tenants/:tenantId/returns/:returnId/restock
GET /tenants/:tenantId/returns/:returnId
GET /tenants/:tenantId/reports/returns-summary
```

## Task ideas

- Refund calculation fails when only part of a return is approved after inspection.
- Rejected returns should release reserved inventory differently from accepted returns.
- Reports should exclude returns from other tenants.
- Restocking damaged items should not increase sellable inventory.
- Audit logs are missing for refund events.
