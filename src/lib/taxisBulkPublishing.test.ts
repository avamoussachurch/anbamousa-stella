import assert from 'node:assert/strict';
import test from 'node:test';
import type { TaxisItem } from '../types';
import { publishApprovedTaxisItems } from './taxisBulkPublishing';

function item(id: string, status: TaxisItem['status']): TaxisItem {
  return {
    id,
    titleAr: id,
    titleEn: id,
    category: 'liturgy',
    audience: 'all',
    status,
    summaryAr: '',
    summaryEn: '',
    sections: [],
    references: [],
    documents: [],
    version: 1,
    createdBy: 'servant',
    createdByName: 'Servant',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    history: []
  };
}

test('bulk publishing invokes the trusted publish operation only for approved selections', async () => {
  const items = [item('approved', 'approved'), item('draft', 'draft')];
  const calls: string[] = [];

  const results = await publishApprovedTaxisItems(items, new Set(['approved', 'draft']), async id => {
    calls.push(id);
    return { success: true };
  });

  assert.deepEqual(calls, ['approved']);
  assert.deepEqual(results, [
    { itemId: 'approved', success: true, error: undefined },
    { itemId: 'draft', success: false, error: 'Only approved Taxis items can be published.' }
  ]);
});

test('bulk publishing retains per-item server failures without stopping later items', async () => {
  const items = [item('failed', 'approved'), item('published', 'approved')];
  const results = await publishApprovedTaxisItems(items, new Set(['failed', 'published']), async id => {
    return id === 'failed'
      ? { success: false, error: 'Approval changed before publishing.' }
      : { success: true };
  });

  assert.deepEqual(results.map(result => result.success), [false, true]);
  assert.equal(results[0].error, 'Approval changed before publishing.');
});
