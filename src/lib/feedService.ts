import { supabase } from './supabase';
import { Post, Comment, Reply, User } from '../types';

export interface ExtendedPost extends Post {
  isPinned?: boolean;
  isAnnouncement?: boolean;
}

export interface FeedReactionCounts {
  heart: number;
  candle: number;
  cross: number;
}

const FEED_CACHE_KEY = 'orthodox_church_feed_posts_v5';
const MIGRATED_LOG_KEY = 'church_feed_migrated_post_ids_v1';

// Known mock/fixture post ID prefixes that must NEVER be written to Supabase
const MOCK_ID_PREFIXES = ['announcement-', 'photo-post-', 'video-post-', 'p0-', 'mock-'];

export function isMockPostId(id: string): boolean {
  if (!id) return false;
  return MOCK_ID_PREFIXES.some(prefix => id.startsWith(prefix));
}

/**
 * Fetch all feed posts, comments, and reactions from Supabase,
 * and reconstruct the nested Post[] structure.
 */
export async function fetchFeedPostsFromSupabase(): Promise<{
  data: ExtendedPost[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    // 1. Fetch posts
    const { data: postsData, error: postsErr } = await supabase
      .from('feed_posts')
      .select('id, author_id, author_name, author_avatar, content, created_at, media_type, media_url, media_thumbnail, media_provider, is_pinned, is_announcement')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsErr) {
      return { data: null, error: new Error(postsErr.message) };
    }

    if (!postsData || postsData.length === 0) {
      return { data: [], error: null };
    }

    const postIds = postsData.map(p => p.id);

    // Comments and post reactions depend only on the post IDs, so request them together.
    const commentsRequest = supabase
      .from('feed_comments')
      .select('id, post_id, parent_id, author_name, author_avatar, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });

    const postReactionsRequest = supabase
      .from('feed_reactions')
      .select('post_id, reaction_type')
      .in('post_id', postIds);

    const [
      { data: commentsData, error: commentsErr },
      { data: postReactionsData, error: pReactionsErr }
    ] = await Promise.all([commentsRequest, postReactionsRequest]);

    if (commentsErr) {
      console.warn('Note on feed_comments query:', commentsErr.message);
    }

    // Fetch comment reactions after the comment IDs are available.
    const commentIds = (commentsData || []).map(c => c.id);

    if (pReactionsErr) {
      console.warn('Note on feed_reactions query for posts:', pReactionsErr.message);
    }

    let commentReactionsData: any[] = [];
    if (commentIds.length > 0) {
      const { data: cReactions, error: cReactionsErr } = await supabase
        .from('feed_reactions')
        .select('comment_id, reaction_type')
        .in('comment_id', commentIds);
      if (!cReactionsErr && cReactions) {
        commentReactionsData = cReactions;
      }
    }

    // Index post reactions
    const postReactionsMap = new Map<string, FeedReactionCounts>();
    for (const r of postReactionsData || []) {
      if (!postReactionsMap.has(r.post_id)) {
        postReactionsMap.set(r.post_id, { heart: 0, candle: 0, cross: 0 });
      }
      const counts = postReactionsMap.get(r.post_id)!;
      if (r.reaction_type in counts) {
        counts[r.reaction_type as keyof FeedReactionCounts]++;
      }
    }

    // Index comment reactions
    const commentReactionsMap = new Map<string, FeedReactionCounts>();
    for (const r of commentReactionsData) {
      if (!commentReactionsMap.has(r.comment_id)) {
        commentReactionsMap.set(r.comment_id, { heart: 0, candle: 0, cross: 0 });
      }
      const counts = commentReactionsMap.get(r.comment_id)!;
      if (r.reaction_type in counts) {
        counts[r.reaction_type as keyof FeedReactionCounts]++;
      }
    }

    // Reconstruct comments and threaded replies
    const commentsByPost = new Map<string, Comment[]>();
    const repliesByParent = new Map<string, Reply[]>();

    for (const c of commentsData || []) {
      const cReactions = commentReactionsMap.get(c.id) || { heart: 0, candle: 0, cross: 0 };
      if (c.parent_id) {
        if (!repliesByParent.has(c.parent_id)) {
          repliesByParent.set(c.parent_id, []);
        }
        repliesByParent.get(c.parent_id)!.push({
          id: c.id,
          authorName: c.author_name,
          authorAvatar: c.author_avatar,
          content: c.content,
          createdAt: c.created_at,
          reactions: cReactions
        });
      }
    }

    for (const c of commentsData || []) {
      if (!c.parent_id) {
        if (!commentsByPost.has(c.post_id)) {
          commentsByPost.set(c.post_id, []);
        }
        const cReactions = commentReactionsMap.get(c.id) || { heart: 0, candle: 0, cross: 0 };
        commentsByPost.get(c.post_id)!.push({
          id: c.id,
          authorName: c.author_name,
          authorAvatar: c.author_avatar,
          content: c.content,
          createdAt: c.created_at,
          reactions: cReactions,
          replies: repliesByParent.get(c.id) || []
        });
      }
    }

    // Assemble final ExtendedPost objects
    const assembled: ExtendedPost[] = postsData.map(p => ({
      id: p.id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
      content: p.content,
      createdAt: p.created_at,
      mediaType: p.media_type || undefined,
      mediaUrl: p.media_url || undefined,
      mediaThumbnail: p.media_thumbnail || undefined,
      mediaProvider: p.media_provider || undefined,
      isPinned: Boolean(p.is_pinned),
      isAnnouncement: Boolean(p.is_announcement),
      reactions: postReactionsMap.get(p.id) || { heart: 0, candle: 0, cross: 0 },
      comments: commentsByPost.get(p.id) || []
    }));

    // Cache locally for offline reading
    try {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(assembled));
    } catch {}

    return { data: assembled, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new feed post in Supabase
 */
export async function createFeedPostInSupabase(params: {
  id?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mediaType?: 'image' | 'video' | 'youtube' | 'audio' | 'embed';
  mediaUrl?: string;
  mediaThumbnail?: string;
  mediaProvider?: string;
  isPinned?: boolean;
  isAnnouncement?: boolean;
}): Promise<{ data: ExtendedPost | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const postId = params.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const payload = {
    id: postId,
    author_id: params.authorId,
    author_name: params.authorName,
    author_avatar: params.authorAvatar || null,
    content: params.content.trim(),
    media_type: params.mediaType || null,
    media_url: params.mediaUrl || null,
    media_thumbnail: params.mediaThumbnail || null,
    media_provider: params.mediaProvider || null,
    is_pinned: Boolean(params.isPinned),
    is_announcement: Boolean(params.isAnnouncement)
  };

  const { data, error } = await supabase
    .from('feed_posts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const createdPost: ExtendedPost = {
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.author_id}`,
    content: data.content,
    createdAt: data.created_at,
    mediaType: data.media_type || undefined,
    mediaUrl: data.media_url || undefined,
    mediaThumbnail: data.media_thumbnail || undefined,
    mediaProvider: data.media_provider || undefined,
    isPinned: Boolean(data.is_pinned),
    isAnnouncement: Boolean(data.is_announcement),
    reactions: { heart: 0, candle: 0, cross: 0 },
    comments: []
  };

  return { data: createdPost, error: null };
}

/**
 * Edit post content & media via secure scoped database function
 */
export async function editFeedPostInSupabase(
  postId: string,
  content: string,
  media?: {
    type?: 'image' | 'video' | 'youtube' | 'audio' | 'embed';
    url?: string;
    thumbnail?: string;
    provider?: string;
  }
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase) {
    return { success: false, error: new Error('Supabase client not initialized') };
  }

  const { data, error } = await supabase.rpc('edit_feed_post', {
    p_post_id: postId,
    p_content: content,
    p_media_type: media?.type || null,
    p_media_url: media?.url || null,
    p_media_thumbnail: media?.thumbnail || null,
    p_media_provider: media?.provider || null
  });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: Boolean(data?.success), error: null };
}

/**
 * Moderate post pin status via secure scoped database function
 */
export async function toggleFeedPostPinInSupabase(
  postId: string,
  isPinned: boolean
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase) {
    return { success: false, error: new Error('Supabase client not initialized') };
  }

  const { data, error } = await supabase.rpc('moderate_feed_post_pin', {
    p_post_id: postId,
    p_is_pinned: isPinned
  });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: Boolean(data?.success), error: null };
}

/**
 * Delete a post from Supabase
 */
export async function deleteFeedPostFromSupabase(
  postId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase) {
    return { success: false, error: new Error('Supabase client not initialized') };
  }

  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Toggle post or comment reaction via secure scoped function
 */
export async function toggleFeedReactionInSupabase(
  reactionType: 'heart' | 'candle' | 'cross',
  target: { postId?: string; commentId?: string }
): Promise<{ action: 'added' | 'removed' | null; error: Error | null }> {
  if (!supabase) {
    return { action: null, error: new Error('Supabase client not initialized') };
  }

  const { data, error } = await supabase.rpc('toggle_feed_reaction', {
    p_post_id: target.postId || null,
    p_comment_id: target.commentId || null,
    p_reaction_type: reactionType
  });

  if (error) {
    return { action: null, error: new Error(error.message) };
  }

  return { action: data?.action || 'added', error: null };
}

/**
 * Add a comment or threaded reply in Supabase
 */
export async function addFeedCommentInSupabase(params: {
  postId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
}): Promise<{ data: Comment | Reply | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const commentId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payload = {
    id: commentId,
    post_id: params.postId,
    parent_id: params.parentId || null,
    author_id: params.authorId,
    author_name: params.authorName,
    author_avatar: params.authorAvatar || null,
    content: params.content.trim()
  };

  const { data, error } = await supabase
    .from('feed_comments')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (params.parentId) {
    const reply: Reply = {
      id: data.id,
      authorName: data.author_name,
      authorAvatar: data.author_avatar || undefined,
      content: data.content,
      createdAt: data.created_at,
      reactions: { heart: 0, candle: 0, cross: 0 }
    };
    return { data: reply, error: null };
  }

  const comment: Comment = {
    id: data.id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar || undefined,
    content: data.content,
    createdAt: data.created_at,
    reactions: { heart: 0, candle: 0, cross: 0 },
    replies: []
  };

  return { data: comment, error: null };
}

/**
 * Delete a comment or reply from Supabase
 */
export async function deleteFeedCommentFromSupabase(
  commentId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase) {
    return { success: false, error: new Error('Supabase client not initialized') };
  }

  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ==============================================================================
// Safe & Idempotent Migration of Local User Posts to Supabase
// ==============================================================================

export interface LocalMigrationResult {
  migratedCount: number;
  skippedMockCount: number;
  unownedCount: number;
  alreadyMigratedCount: number;
  errors: string[];
}

/**
 * Inspects localStorage cache and migrates ONLY authentic posts authored by the
 * currently authenticated user.
 *
 * Rules:
 * 1. Skips all mock fixtures (announcement-1, photo-post-1, p0-*, mock-*)
 * 2. Skips posts where post.authorId !== currentUser.id (never impersonate another author)
 * 3. Checks if post already exists on Supabase (idempotent, never duplicates)
 * 4. Preserves post ID, content, creation timestamp, media URL, provider
 * 5. Verifies server read-back before recording as migrated
 */
export async function syncUserLocalPostsToSupabase(
  currentUser: User
): Promise<LocalMigrationResult> {
  const result: LocalMigrationResult = {
    migratedCount: 0,
    skippedMockCount: 0,
    unownedCount: 0,
    alreadyMigratedCount: 0,
    errors: []
  };

  if (!supabase || !currentUser?.id) {
    result.errors.push('Cannot sync: user not authenticated or Supabase not configured');
    return result;
  }

  let rawPosts: any[] = [];
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rawPosts = parsed;
      }
    }
  } catch (e: any) {
    result.errors.push(`Failed to read local feed cache: ${e.message}`);
    return result;
  }

  if (rawPosts.length === 0) {
    return result;
  }

  // Read previously migrated IDs to prevent redundant network calls
  let migratedIds = new Set<string>();
  try {
    const rawMig = localStorage.getItem(MIGRATED_LOG_KEY);
    if (rawMig) {
      migratedIds = new Set(JSON.parse(rawMig));
    }
  } catch {}

  for (const post of rawPosts) {
    // 1. Skip mock/sample fixtures
    if (isMockPostId(post.id)) {
      result.skippedMockCount++;
      continue;
    }

    // 2. Skip posts not authored by current user
    if (post.authorId !== currentUser.id) {
      result.unownedCount++;
      continue;
    }

    // 3. Skip if already migrated previously
    if (migratedIds.has(post.id)) {
      result.alreadyMigratedCount++;
      continue;
    }

    // 4. Check if post exists on server
    const { data: existing } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('id', post.id)
      .maybeSingle();

    if (existing) {
      migratedIds.add(post.id);
      result.alreadyMigratedCount++;
      continue;
    }

    // 5. Insert post into Supabase
    const payload = {
      id: post.id,
      author_id: currentUser.id,
      author_name: currentUser.fullName,
      author_avatar: currentUser.avatarUrl || null,
      content: post.content,
      media_type: post.mediaType || null,
      media_url: post.mediaUrl || null,
      media_thumbnail: post.mediaThumbnail || null,
      media_provider: post.mediaProvider || null,
      is_pinned: false, // Author cannot auto-pin on migration unless servant
      is_announcement: false,
      created_at: post.createdAt || new Date().toISOString()
    };

    const { error: insErr } = await supabase
      .from('feed_posts')
      .insert(payload);

    if (insErr) {
      result.errors.push(`Post ${post.id}: ${insErr.message}`);
      continue;
    }

    // 6. Verify server read-back before recording success
    const { data: readBack } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('id', post.id)
      .maybeSingle();

    if (readBack?.id === post.id) {
      migratedIds.add(post.id);
      result.migratedCount++;
    } else {
      result.errors.push(`Post ${post.id}: write could not be confirmed via read-back`);
    }
  }

  // Save updated migration log
  try {
    localStorage.setItem(MIGRATED_LOG_KEY, JSON.stringify(Array.from(migratedIds)));
  } catch {}

  return result;
}
