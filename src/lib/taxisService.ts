import { TaxisItem, TaxisUserPermissions, TaxisAudience, TaxisCategory, TaxisStatus, User } from '../types';
import { filterTaxisItemsByLevel, parseHymnsTaxisLevel } from './hymnsTaxisLevel';
import { markCurriculumImportDraft } from './curriculumImport';

export const INITIAL_TAXIS_COLLECTION: TaxisItem[] = [
  {
    id: 'taxis_incense_matins_vespers',
    titleAr: 'طقس رفع بخور عشية وباكر',
    titleEn: 'Offering of Incense (Matins & Vespers)',
    titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲟⲩⲱϣⲧ ⲛ̀ϣⲱⲡ ⲛⲉⲙ ⲣⲟⲩϩⲓ',
    category: 'incense',
    audience: 'all',
    status: 'published',
    summaryAr: 'الترتيب الطقسي الكامل لصلوات رفع بخور عشية وباكر مع أدوار الكاهن، مردات الشماس، وألحان الخورس.',
    summaryEn: 'Complete liturgical order for Matins & Vespers Incense service with priest actions, deacon responses, and choir chants.',
    version: 1,
    createdBy: 'user_teacher_mina_101',
    createdByName: 'الخادم مينا',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    publishedBy: 'user_teacher_mina_101',
    publishedAt: '2026-09-01T08:00:00.000Z',
    references: ['كتاب طقس الكنيسة القبطية الأرثوذكسية - الأنبا متاؤس', 'الخلاجي المقدس'],
    documents: [
      {
        id: 'doc_incense_guide',
        title: 'دليل الشمامسة في رفع بخور عشية وباكر (PDF)',
        fileUrl: '/uploads/sample_cross_lesson_handout.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf'
      }
    ],
    sections: [
      {
        id: 'sec_1',
        order: 1,
        titleAr: 'صلاة الشكر وفتح الستر',
        titleEn: 'Thanksgiving Prayer & Unveiling of the Sanctuary',
        titleCopt: 'Ⲡⲓϣⲗⲏⲗ ⲛ̀ϯϣⲉⲡϩ̀ⲙⲟⲧ',
        contentAr: 'يقف الكاهن أمام الهيكل خاشعاً، ويفتح الستر قائلاً: "إرحمنا يا الله الآب ضابط الكل..." ثم يتلو صلاة الشكر.',
        contentEn: 'The priest stands reverently before the sanctuary, opening the veil and praying the Thanksgiving Prayer.',
        priestAction: 'يسجد الكاهن أمام باب الهيكل، ثم يفتح الستر ويرشم الشعب بالصليب.',
        deaconResponse: 'مرد الشماس: "صلوا من أجل صلاة الشكر المقدسة لكي ينعم الرب بإحسانه..."'
      },
      {
        id: 'sec_2',
        order: 2,
        titleAr: 'دورة البخور وأواشي الصغار والكبار',
        titleEn: 'Circuits of Incense & Petitions',
        titleCopt: 'Ⲡⲓⲕⲱϯ ⲛ̀ⲧⲉ ⲡⲓⲥ̀ⲑⲟⲓⲛⲟⲩϥⲓ',
        contentAr: 'يضع الكاهن يد البخور في المجمرة ويرفع البخور أمام المذبح ۳ دفعات، ثم يصلي أوشية الراقدين في العشية وأوشية المرضى والمسافرين في باكر.',
        contentEn: 'The priest places incense in the censer, offers 3 circuits before the altar, praying for the departed in Vespers and for the sick/travelers in Matins.',
        rubricNotes: 'في أيام الآحاد والأعياد السيدية لا تقال أوشية المسافرين وتستبدل بأوشية القرابين.'
      }
    ]
  },
  {
    id: 'taxis_liturgy_st_basil',
    titleAr: 'طقس القداس الباسيلي المقدس',
    titleEn: 'The Divine Liturgy of St. Basil',
    titleCopt: 'Ϯⲁ̀ⲛⲁⲫⲟⲣⲁ ⲛ̀ⲧⲉ ⲡⲓⲁ̀ⲅⲓⲟⲥ Ⲃⲁⲥⲓⲗⲓⲟⲥ',
    category: 'liturgy',
    audience: 'all',
    status: 'published',
    summaryAr: 'طقس قداس المؤمنين من صلاة الصلح، والأنافورا، والاستدعاء، والتقديس، والمجمع، وقسمة الجسد والدم الطاهرين.',
    summaryEn: 'The sacred order of the Liturgy of the Believers: Prayer of Reconciliation, Anaphora, Epiclesis, Commemoration, and Holy Fraction.',
    version: 1,
    createdBy: 'user_teacher_mina_101',
    createdByName: 'الخادم مينا',
    createdAt: '2026-09-05T09:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
    publishedBy: 'user_teacher_mina_101',
    publishedAt: '2026-09-05T09:00:00.000Z',
    references: ['كتاب القداسات الثلاثة - دير السريان العامر', 'التقليد الليتورجي السكندري'],
    documents: [
      {
        id: 'doc_basil_anaphora',
        title: 'نص الأنافورا الباسيلية بالقبطي والعربي (PDF)',
        fileUrl: '/uploads/sample_cross_lesson_handout.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf'
      }
    ],
    sections: [
      {
        id: 'sec_b1',
        order: 1,
        titleAr: 'صلاة الصلح ومرد القبلة المقدسة',
        titleEn: 'Prayer of Reconciliation & Holy Kiss',
        titleCopt: 'Ⲡⲓϣⲗⲏⲗ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ',
        contentAr: 'يصلي الكاهن صلاة الصلح طالباً السلام السمائي، وعند ختامها ينادي الشماس: "قبلوا بعضكم بعضاً بقبلة مقدسة..." ويرفع الإبروسفارين.',
        contentEn: 'The priest petitions for heavenly peace, followed by the deacon proclamation to greet one another with a holy kiss while lifting the Prospherin.',
        deaconResponse: 'مرد الشماس: "قبلوا بعضكم بعضاً بقبلة مقدسة يا رب ارحم..."'
      },
      {
        id: 'sec_b2',
        order: 2,
        titleAr: 'الرشومات والتقديس وحلول الروح القدس (الإبيكليسيس)',
        titleEn: 'Consecration & Epiclesis',
        titleCopt: 'Ⲡⲓϫⲓⲛⲧⲱⲃϩ ⲛ̀ⲧⲉ Ⲡⲓⲡ̀ⲛⲉⲩⲙⲁ Ⲉⲑⲟⲩⲁⲃ',
        contentAr: 'يسجد الكاهن والشعب في خشوع مهيب طلباً لحلول الروح القدس ليحول الخبز إلى جسد المسيح والخمر إلى دمه الأقدس.',
        contentEn: 'Reverent prostration by clergy and congregation calling down the Holy Spirit to consecrate the Holy Gifts.',
        rubricNotes: 'يسجد جميع من في الكنيسة إلى الأرض في صمت وخشوع تام.'
      }
    ]
  },
  {
    id: 'taxis_baptism_chrismation',
    titleAr: 'طقس سر المعمودية والميرون المقدس',
    titleEn: 'Sacrament of Holy Baptism & Chrismation',
    titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲱⲙⲥ ⲉⲑⲟⲩⲁⲃ ⲛⲉⲙ ⲡⲓⲙⲩⲣⲟⲛ',
    category: 'sacraments',
    audience: 'all',
    status: 'published',
    summaryAr: 'طقس التغطيس الثلاثي باسم الثالوث القدوس، وجحد الشيطان، وقانون الإيمان، والمسح بست وثلاثين رشمة بالميرون.',
    summaryEn: 'Sacramental rite of triple immersion in the name of the Trinity, renunciation of Satan, Creed, and 36 holy anointings with Chrism.',
    version: 1,
    createdBy: 'user_teacher_mina_101',
    createdByName: 'الخادم مينا',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    publishedBy: 'user_teacher_mina_101',
    publishedAt: '2026-09-10T10:00:00.000Z',
    references: ['كتاب أسرار الكنيسة السبعة - الكنيسة القبطية الأرثوذكسية'],
    documents: [],
    sections: [
      {
        id: 'sec_bapt_1',
        order: 1,
        titleAr: 'صلوات تحليل الأم وجحد الشيطان وتلاوة الإيمان',
        titleEn: 'Absolution of the Mother & Renunciation of Satan',
        contentAr: 'تتجه الأم والعراب نحو الغرب لجحد إبليس، ثم يتجهان نحو الشرق لإعلان الإيمان بربنا يسوع المسيح وتلاوة قانون الإيمان.',
        priestAction: 'يدهن الكاهن جبهة الطفل بزيت الغاليلاون (الفرح).'
      }
    ]
  },
  {
    id: 'taxis_pascha_good_friday',
    titleAr: 'طقس أسبوع الآلام والجمعة العظيمة المقدسة',
    titleEn: 'Holy Pascha & Good Friday Rite',
    titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ϯⲠⲁⲥⲭⲁ ⲉⲑⲟⲩⲁⲃ',
    category: 'pascha',
    audience: 'deacons',
    status: 'published',
    summaryAr: 'ترتيب صلوات السواعي النهارية والمسائية في أسبوع البصخة، ونبوات العهد القديم، وألحان الجمعة الكبيرة ودفن المخلص.',
    summaryEn: 'Liturgical order of day and night Pascha hours, Prophecies, solemn Great Friday hymns, and the icon burial rite.',
    version: 1,
    createdBy: 'user_teacher_mina_101',
    createdByName: 'الخادم مينا',
    createdAt: '2026-09-12T11:00:00.000Z',
    updatedAt: '2026-09-12T11:00:00.000Z',
    publishedBy: 'user_teacher_mina_101',
    publishedAt: '2026-09-12T11:00:00.000Z',
    references: ['دلال أسبوع الآلام القبطي الأرثوذكسي'],
    documents: [],
    sections: [
      {
        id: 'sec_pascha_1',
        order: 1,
        titleAr: 'تسبحة البصخة المقدسة (ثوك تي تي جوم)',
        titleEn: 'Paschal Doxology (Thok Te Ti Gom)',
        contentAr: 'ترتل تسبحة "لك القوة والمجد والبركة والعزة إلى الأبد آمين.. عمانوئيل إلهنا وملكنا" ۱۲ مرة في كل ساعة بصخة بدلاً من المزامير.',
        rubricNotes: 'تُرتل بنغمة الآلام المهيبة مع إطفاء الأنوار وإشعال الشموع أمام صليب المخلص.'
      }
    ]
  }
];

const TAXIS_STORAGE_KEY = 'church_coptic_taxis_items';

function getStoredTaxisItems(): TaxisItem[] {
  if (typeof window === 'undefined') return INITIAL_TAXIS_COLLECTION;
  try {
    const raw = localStorage.getItem(TAXIS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Could not read Taxis items from localStorage:', e);
  }
  return INITIAL_TAXIS_COLLECTION;
}

function saveStoredTaxisItems(items: TaxisItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TAXIS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('church_taxis_updated', { detail: items }));
  } catch (e) {
    console.warn('Could not save Taxis items to localStorage:', e);
  }
}

/**
 * Computes explicit granular permissions for a user on Taxis content
 */
export function computeTaxisPermissions(
  user: User | null | undefined,
  item?: TaxisItem | null
): TaxisUserPermissions {
  if (!user) {
    return {
      canView: Boolean(item && item.status === 'published' && item.audience === 'all'),
      canCreate: false,
      canEdit: false,
      canSubmitReview: false,
      canReview: false,
      canApprove: false,
      canPublish: false,
      canUnpublish: false,
      canRestore: false,
      canManagePermissions: false
    };
  }

  const role = user.role;
  const isSuperAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isAuthor = Boolean(item && item.createdBy === user.id);
  const isAssignedEditor = Boolean(item && item.assignedEditors?.includes(user.id));
  const isAssignedReviewer = Boolean(item && item.assignedReviewers?.includes(user.id));

  // Admin has full capabilities
  if (isSuperAdmin) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canSubmitReview: true,
      canReview: true,
      canApprove: true,
      canPublish: true,
      canUnpublish: true,
      canRestore: true,
      canManagePermissions: true
    };
  }

  // Teacher / Servant role
  if (isTeacher) {
    return {
      canView: true,
      canCreate: true,
      canEdit: isAuthor || isAssignedEditor || !item, // authors and assigned editors
      canSubmitReview: isAuthor || isAssignedEditor,
      canReview: isAssignedReviewer || Boolean(user.grade?.includes('Deacon')),
      canApprove: isAssignedReviewer,
      canPublish: Boolean(user.grade?.includes('Head') || user.grade?.includes('Priest')),
      canUnpublish: Boolean(user.grade?.includes('Head') || user.grade?.includes('Priest')),
      canRestore: Boolean(user.grade?.includes('Head')),
      canManagePermissions: false
    };
  }

  // Student role: can only view published items matching audience
  const isAudienceAllowed = Boolean(
    !item || 
    item.audience === 'all' || 
    (item.audience === 'preparatory' && user.grade?.includes('Prep')) ||
    (item.audience === 'deacons' && (user.grade?.includes('Deacon') || user.grade?.includes('Hymn')))
  );

  return {
    canView: Boolean(item && item.status === 'published' && isAudienceAllowed),
    canCreate: false,
    canEdit: false,
    canSubmitReview: false,
    canReview: false,
    canApprove: false,
    canPublish: false,
    canUnpublish: false,
    canRestore: false,
    canManagePermissions: false
  };
}

/**
 * Fetch list of Taxis items authorized for the current user
 */
export async function getTaxisItems(category?: string, audience?: string, viewer?: User): Promise<{
  success: boolean;
  items: TaxisItem[];
  error?: string;
}> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('church_auth_token') : null;
  const filterForStudent = (items: TaxisItem[], checkAudience = true) => {
    if (viewer?.role !== 'student') return items;
    const level = parseHymnsTaxisLevel(viewer.hymnsTaxisLevel);
    if (level === null) return [];
    const grade = (viewer.grade || '').toLowerCase();
    return filterTaxisItemsByLevel(items, level).filter(item =>
      item.status === 'published' &&
      (!checkAudience || item.audience === 'all' ||
        (item.audience === 'preparatory' && grade.includes('prep')) ||
        (item.audience === 'deacons' && level >= 2))
    );
  };
  try {
    const q = new URLSearchParams();
    if (category && category !== 'ALL') q.set('category', category);
    if (audience && audience !== 'ALL') q.set('audience', audience);

    const res = await fetch(`/api/church/taxis?${q.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        let items = filterForStudent(data.items, false);
        if (category && category !== 'ALL') items = items.filter(item => item.category === category);
        if (audience && audience !== 'ALL') items = items.filter(item => item.audience === audience);
        return { success: true, items };
      }
      if (token) return { success: false, items: [], error: data.message || data.error || 'Could not load Taxis lessons.' };
    } else if (token) {
      return { success: false, items: [], error: `Could not load Taxis lessons (HTTP ${res.status}).` };
    }
  } catch (error) {
    if (token) return { success: false, items: [], error: error instanceof Error ? error.message : 'Network error while loading Taxis lessons.' };
  }

  if (viewer?.role === 'student' && parseHymnsTaxisLevel(viewer.hymnsTaxisLevel) === null) {
    return { success: false, items: [], error: 'Choose your shared Hymns and Taxis level to view lessons.' };
  }

  // Only unauthenticated demo mode can use local items.
  const local = getStoredTaxisItems();
  let filtered = filterForStudent(local);
  if (category && category !== 'ALL') filtered = filtered.filter(i => i.category === category);
  if (audience && audience !== 'ALL') filtered = filtered.filter(i => i.audience === audience);
  return { success: true, items: filtered };
}

/**
 * Save or publish a Taxis item
 */
export async function saveTaxisItem(
  item: Partial<TaxisItem> & { titleAr: string; titleEn: string },
  user: User
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  let token: string | null = null;
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('church_auth_token') : null;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not read the authentication session.' };
  }

  try {
    const isNew = !item.id || item.id.startsWith('new_');
    const url = isNew ? '/api/church/taxis' : `/api/church/taxis/${encodeURIComponent(item.id!)}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(item)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.item) {
        const local = getStoredTaxisItems().filter(i => i.id !== data.item.id);
        saveStoredTaxisItems([data.item, ...local]);
        return { success: true, item: data.item };
      } else {
        return { success: false, error: data.message || data.error };
      }
    }
    if (token) return { success: false, error: `Could not save Taxis item (HTTP ${res.status}).` };
  } catch (error) {
    if (token) return { success: false, error: error instanceof Error ? error.message : 'Network error while saving Taxis item.' };
  }

  // Local fallback
  const list = getStoredTaxisItems();
  const existingIdx = list.findIndex(i => i.id === item.id);
  const now = new Date().toISOString();

  let finalItem: TaxisItem;
  if (existingIdx >= 0) {
    const prev = list[existingIdx];
    finalItem = {
      ...prev,
      ...item,
      version: prev.version + 1,
      updatedAt: now,
      history: [
        ...(prev.history || []),
        {
          version: prev.version,
          status: prev.status,
          titleAr: prev.titleAr,
          titleEn: prev.titleEn,
          sectionsCount: prev.sections?.length || 0,
          savedBy: user.id,
          savedByName: user.fullName,
          savedAt: now
        }
      ]
    } as TaxisItem;
    list[existingIdx] = finalItem;
  } else {
    finalItem = {
      id: item.id || `taxis_${Date.now()}`,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      titleCopt: item.titleCopt,
      category: item.category || 'liturgy',
      audience: item.audience || 'all',
      status: item.status || 'draft',
      summaryAr: item.summaryAr || '',
      summaryEn: item.summaryEn || '',
      sections: item.sections || [],
      references: item.references || [],
      documents: item.documents || [],
      version: 1,
      history: [],
      createdBy: user.id,
      createdByName: user.fullName,
      createdAt: now,
      updatedAt: now
    };
    list.unshift(finalItem);
  }

  saveStoredTaxisItems(list);
  return { success: true, item: finalItem };
}

export async function createTaxisDraft(
  item: Partial<TaxisItem> & { id: string; titleAr: string; titleEn: string }
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  let token: string | null = null;
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('church_auth_token') : null;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not read the authentication session.' };
  }
  if (!token) return { success: false, error: 'Your session expired. Sign in again before creating a curriculum draft.' };

  try {
    const response = await fetch('/api/church/taxis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(markCurriculumImportDraft(item))
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.item) {
      return {
        success: false,
        error: data?.message || data?.error || `Could not create Taxis draft (HTTP ${response.status}).`
      };
    }

    const local = getStoredTaxisItems().filter(existing => existing.id !== data.item.id);
    saveStoredTaxisItems([data.item, ...local]);
    return { success: true, item: data.item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error while creating Taxis draft.' };
  }
}

/**
 * Execute administrative status action on Taxis item: SUBMIT, APPROVE, PUBLISH, UNPUBLISH, RESTORE
 */
export async function executeTaxisStatusAction(
  itemId: string,
  action: 'SUBMIT_REVIEW' | 'APPROVE' | 'PUBLISH' | 'UNPUBLISH' | 'RESTORE',
  params?: { restoreVersion?: number; notes?: string }
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  let token: string | null = null;
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('church_auth_token') : null;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not read the authentication session.' };
  }

  try {
    let endpoint = '';
    let payload: any = {};

    if (action === 'SUBMIT_REVIEW') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/submit-review`;
    } else if (action === 'APPROVE') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/review`;
      payload = { action: 'APPROVE', notes: params?.notes };
    } else if (action === 'PUBLISH') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/publish`;
    } else if (action === 'UNPUBLISH') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/unpublish`;
    } else if (action === 'RESTORE') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/restore`;
      payload = { targetVersion: params?.restoreVersion };
    }

    if (endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.item) {
          const local = getStoredTaxisItems().filter(i => i.id !== data.item.id);
          saveStoredTaxisItems([data.item, ...local]);
          return { success: true, item: data.item };
        } else {
          return { success: false, error: data.message || data.error };
        }
      }
      if (token) return { success: false, error: `Could not update Taxis item (HTTP ${res.status}).` };
    }
  } catch (error) {
    if (token) return { success: false, error: error instanceof Error ? error.message : 'Network error while updating Taxis item.' };
  }

  // Local fallback
  const list = getStoredTaxisItems();
  const idx = list.findIndex(i => i.id === itemId);
  if (idx < 0) return { success: false, error: 'Taxis item not found' };

  const item = { ...list[idx] };
  if (action === 'PUBLISH' && parseHymnsTaxisLevel(item.level) === null) {
    return { success: false, error: 'Assign this item to a valid curriculum level before publishing.' };
  }
  const now = new Date().toISOString();
  item.updatedAt = now;

  if (action === 'SUBMIT_REVIEW') item.status = 'under_review';
  else if (action === 'APPROVE') item.status = 'approved';
  else if (action === 'PUBLISH') { item.status = 'published'; item.publishedAt = now; }
  else if (action === 'UNPUBLISH') { item.status = 'unpublished'; item.unpublishedAt = now; }
  else if (action === 'RESTORE' && params?.restoreVersion) {
    const target = item.history?.find(h => h.version === params.restoreVersion);
    if (target) {
      item.titleAr = target.titleAr;
      item.titleEn = target.titleEn;
      item.version = (item.version || 1) + 1;
    }
  }

  list[idx] = item;
  saveStoredTaxisItems(list);
  return { success: true, item };
}
