import { returnRepository } from '../returns/returnRepository';

export const reportService = {
  returnsSummary(tenantId: string) {
    const returns = returnRepository.listByTenant(tenantId);
    return {
      totalReturns: returns.length,
      requested: returns.filter(item => item.status === 'requested').length,
      approved: returns.filter(item => item.status === 'approved').length,
      inspected: returns.filter(item => item.status === 'inspected').length,
      refunded: returns.filter(item => item.status === 'refunded').length,
      restocked: returns.filter(item => item.status === 'restocked').length,
      rejected: returns.filter(item => item.status === 'rejected').length,
      totalRefundCents: returns.reduce((sum, item) => sum + item.refundCents, 0)
    };
  }
};
