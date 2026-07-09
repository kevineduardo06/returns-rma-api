export interface InventoryItem {
  tenantId: string;
  sku: string;
  available: number;
  reservedForInspection: number;
  damaged: number;
}
