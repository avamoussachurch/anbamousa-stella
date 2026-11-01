import { getHymns } from './hymnsService';
import { getTaxisItems } from './taxisService';
import { filterItemsByHymnsTaxisLevel, filterTaxisItemsByLevel } from './hymnsTaxisLevel';
import type { CopticHymnItem } from '../data/hymnsData';
import type { TaxisItem } from '../types';

export interface ServantPreviewSchoolContent {
  hymns: CopticHymnItem[];
  taxis: TaxisItem[];
}

export async function loadServantPreviewSchoolContent(
  level: 1 | 2 | 3,
  grade: string
): Promise<ServantPreviewSchoolContent> {
  const [hymnsResult, taxisResult] = await Promise.all([
    getHymns(level, 'all', 'published'),
    getTaxisItems()
  ]);

  if (!hymnsResult.success) {
    throw new Error(hymnsResult.error || 'Could not load published Hymns curriculum.');
  }
  if (!taxisResult.success) {
    throw new Error(taxisResult.error || 'Could not load published Coptic Taxis curriculum.');
  }

  const isPreparatoryGrade = grade.toLowerCase().includes('prep');
  return {
    hymns: filterItemsByHymnsTaxisLevel(
      hymnsResult.items.filter(item => item.status === 'published'),
      level
    ),
    taxis: filterTaxisItemsByLevel(
      taxisResult.items.filter(item =>
        item.status === 'published' &&
        (item.audience === 'all' ||
          (item.audience === 'preparatory' && isPreparatoryGrade) ||
          (item.audience === 'deacons' && level >= 2))
      ),
      level
    )
  };
}
