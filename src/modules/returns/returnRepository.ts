import { createId } from '../../shared/id';
import { AuditLog, ReturnRequest } from './returnTypes';

const returns = new Map<string, ReturnRequest>();
const auditLogs: AuditLog[] = [];

export const returnRepository = {
  create(input: Omit<ReturnRequest, 'id'>): ReturnRequest {
    const record: ReturnRequest = { ...input, id: createId('rma') };
    returns.set(record.id, record);
    return record;
  },

  findById(tenantId: string, id: string): ReturnRequest | undefined {
    const record = returns.get(id);
    return record?.tenantId === tenantId ? record : undefined;
  },

  listByTenant(tenantId: string): ReturnRequest[] {
    return [...returns.values()].filter(record => record.tenantId === tenantId);
  },

  save(record: ReturnRequest): ReturnRequest {
    returns.set(record.id, record);
    return record;
  },

  addAudit(tenantId: string, entityId: string, action: string, message: string): AuditLog {
    const log: AuditLog = { id: createId('aud'), tenantId, entityId, action, message, createdAt: new Date().toISOString() };
    auditLogs.push(log);
    return log;
  },

  listAudit(tenantId: string, entityId?: string): AuditLog[] {
    return auditLogs.filter(log => log.tenantId === tenantId && (!entityId || log.entityId === entityId));
  },

  clear(): void {
    returns.clear();
    auditLogs.length = 0;
  }
};
