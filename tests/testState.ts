import { inventoryRepository } from '../src/modules/inventory/inventoryRepository';
import { orderRepository } from '../src/modules/orders/orderRepository';
import { returnRepository } from '../src/modules/returns/returnRepository';
import { resetIds } from '../src/shared/id';

export function resetState(): void {
  resetIds();
  orderRepository.clear();
  returnRepository.clear();
  inventoryRepository.clear();
}
