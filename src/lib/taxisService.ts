import { TaxisItem, TaxisUserPermissions, TaxisAudience, TaxisCategory, TaxisStatus, User } from '../types';
import { filterTaxisItemsByLevel, parseHymnsTaxisLevel } from './hymnsTaxisLevel';
import { markCurriculumImportDraft } from './curriculumImport';
import { hasRole } from './workspaces';
import { getAuthenticatedApiHeaders, getAuthenticatedApiToken } from './apiAuth';
import { isSupabaseConfigured } from './supabase';

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

  const isSuperAdmin = hasRole(user, 'admin');
  const isTeacher = hasRole(user, 'teacher');
  const isAuthor = Boolean(item && item.createdBy === user.id);

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
    const grade = (user.grade || '').toLowerCase();
    return {
      canView: true,
      canCreate: true,
      canEdit: isAuthor || !item,
      canSubmitReview: isAuthor,
      canReview: isAuthor,
      canApprove: isAuthor,
      canPublish: isAuthor && (grade.includes('head') || grade.includes('priest')),
      canUnpublish: isAuthor && (grade.includes('head') || grade.includes('priest')),
      canRestore: isAuthor && grade.includes('head'),
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
  const filterForStudent = (items: TaxisItem[], checkAudience = true) => {
    if (!hasRole(viewer, 'student')) return items;
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
  if (!isSupabaseConfigured) {
    let items = filterForStudent(INITIAL_TAXIS_COLLECTION);
    if (category && category !== 'ALL') items = items.filter(item => item.category === category);
    if (audience && audience !== 'ALL') items = items.filter(item => item.audience === audience);
    return { success: true, items };
  }

  try {
    const q = new URLSearchParams();
    if (category && category !== 'ALL') q.set('category', category);
    if (audience && audience !== 'ALL') q.set('audience', audience);

    const res = await fetch(`/api/church/taxis?${q.toString()}`, {
      headers: await getAuthenticatedApiHeaders()
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { success: false, items: [], error: data?.message || data?.error || `Could not load Taxis lessons (HTTP ${res.status}).` };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      let items = filterForStudent(data.items, false);
      if (category && category !== 'ALL') items = items.filter(item => item.category === category);
      if (audience && audience !== 'ALL') items = items.filter(item => item.audience === audience);
      return { success: true, items };
    }
    return { success: false, items: [], error: data.message || data.error || 'Could not load Taxis lessons.' };
  } catch (error) {
    return { success: false, items: [], error: error instanceof Error ? error.message : 'Network error while loading Taxis lessons.' };
  }
}

/**
 * Save or publish a Taxis item
 */
export async function saveTaxisItem(
  item: Partial<TaxisItem> & { titleAr: string; titleEn: string }
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured; Taxis changes cannot be persisted.' };
  }

  let token: string;
  try {
    token = await getAuthenticatedApiToken();
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

    const data = await res.json().catch(() => null);
    if (!res.ok) return { success: false, error: data?.message || data?.error || `Could not save Taxis item (HTTP ${res.status}).` };
    if (data?.success && data.item) return { success: true, item: data.item };
    return { success: false, error: data?.message || data?.error || 'Supabase did not confirm the Taxis save.' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error while saving Taxis item.' };
  }
}

export async function createTaxisDraft(
  item: Partial<TaxisItem> & { id: string; titleAr: string; titleEn: string }
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  try {
    const response = await fetch('/api/church/taxis', {
      method: 'POST',
      headers: {
        ...(await getAuthenticatedApiHeaders())
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
  action: 'SUBMIT_REVIEW' | 'APPROVE' | 'REQUEST_CHANGES' | 'PUBLISH' | 'UNPUBLISH' | 'RESTORE',
  params?: { restoreVersion?: number; notes?: string }
): Promise<{ success: boolean; item?: TaxisItem; error?: string }> {
  try {
    let endpoint = '';
    let payload: any = {};

    if (action === 'SUBMIT_REVIEW') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/submit-review`;
    } else if (action === 'APPROVE' || action === 'REQUEST_CHANGES') {
      endpoint = `/api/church/taxis/${encodeURIComponent(itemId)}/review`;
      payload = { action, notes: params?.notes };
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
          ...(await getAuthenticatedApiHeaders())
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.item) {
          return { success: true, item: data.item };
        } else {
          return { success: false, error: data.message || data.error };
        }
      }
      return { success: false, error: `Could not update Taxis item (HTTP ${res.status}).` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error while updating Taxis item.' };
  }

  return { success: false, error: 'Taxis workflow status could not be updated.' };
}
