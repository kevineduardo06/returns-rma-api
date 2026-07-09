import { InventoryItem } from './inventoryTypes';

const inventory = new Map<string, InventoryItem>();
const key = (tenantId: string, sku: string) => `${tenantId}:${sku}`;

export const inventoryRepository = {
  upsert(item: InventoryItem): InventoryItem {
    inventory.set(key(item.tenantId, item.sku), { ...item });
    return this.get(item.tenantId, item.sku)!;
  },

  get(tenantId: string, sku: string): InventoryItem | undefined {
    const item = inventory.get(key(tenantId, sku));
    return item ? { ...item } : undefined;
  },

  reserveForInspection(tenantId: string, sku: string, quantity: number): InventoryItem {
    const item = this.get(tenantId, sku) ?? { tenantId, sku, available: 0, reservedForInspection: 0, damaged: 0 };
    item.reservedForInspection += quantity;
    inventory.set(key(tenantId, sku), item);
    return { ...item };
  },

  restockSellable(tenantId: string, sku: string, quantity: number): InventoryItem {
    const item = this.get(tenantId, sku) ?? { tenantId, sku, available: 0, reservedForInspection: 0, damaged: 0 };
    item.reservedForInspection = Math.max(0, item.reservedForInspection - quantity);
    item.available += quantity;
    inventory.set(key(tenantId, sku), item);
    return { ...item };
  },

  markDamaged(tenantId: string, sku: string, quantity: number): InventoryItem {
    const item = this.get(tenantId, sku) ?? { tenantId, sku, available: 0, reservedForInspection: 0, damaged: 0 };
    item.reservedForInspection = Math.max(0, item.reservedForInspection - quantity);
    item.damaged += quantity;
    inventory.set(key(tenantId, sku), item);
    return { ...item };
  },

  clear(): void {
    inventory.clear();
  }
};
