import type { TaxisItem } from '../types';

export interface TaxisBulkPublishResult {
  itemId: string;
  success: boolean;
  error?: string;
}

export async function publishApprovedTaxisItems(
  items: TaxisItem[],
  selectedIds: ReadonlySet<string>,
  publish: (itemId: string) => Promise<{ success: boolean; error?: string }>
): Promise<TaxisBulkPublishResult[]> {
  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const results: TaxisBulkPublishResult[] = [];

  for (const item of selectedItems) {
    if (item.status !== 'approved') {
      results.push({ itemId: item.id, success: false, error: 'Only approved Taxis items can be published.' });
      continue;
    }

    const result = await publish(item.id);
    results.push({ itemId: item.id, success: result.success, error: result.error });
  }

  return results;
}
