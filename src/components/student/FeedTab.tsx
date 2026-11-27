import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_STUDENT_AVATAR } from '../../data/copticAvatars';
import { FeedPeopleDirectory } from './FeedPeopleDirectory';
import { CLASS_GROUPS } from '../../lib/classGroups';
import { 
  MessageCircle, Heart, Share2, Send, CornerDownRight, X, Pin, Trash2, 
  ShieldCheck, Sparkles, ArrowUpDown, Flame, Clock, Bell, Bookmark, BookmarkCheck, User as UserIcon,
  Image as ImageIcon, Video, Link2, Loader2, Play, Info, ExternalLink, AlertCircle, Check, Maximize2, Mic, Square, Pause,
  Volume2, Database, HardDrive, Music, HelpCircle, CheckCircle2, Server, CloudLightning, Flag, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeedAttachment, Post, Comment, Reply, Language, FeedReactionKey } from '../../types';
import { UniversalAudioPlayer } from '../design-system/UniversalAudioPlayer';
import { FeedVideoPlayer } from './FeedVideoPlayer';
import { FeedEmbeddedMediaPlayer } from './FeedEmbeddedMediaPlayer';
import { FeedVoiceMessage } from './FeedVoiceMessage';


import { getLocalizedErrorMessage } from '../../lib/localizedErrors';
import { useAuth } from '../../context/AuthContext';
import { useActiveWorkspace } from '../../context/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import { getFeedDisplayState } from '../../lib/feedDisplayState';
import { uploadFeedMediaToSupabase, extractEmbedMedia, checkStorageBackendStatus } from '../../lib/supabaseDatabase';
import {
  fetchFeedPostsFromSupabase,
  createFeedPostInSupabase,
  cleanupFeedMediaReferences,
  FeedPostAttachmentInput,
  deleteFeedPostFromSupabase,
  toggleFeedPostPinInSupabase,
  toggleFeedReactionInSupabase,
  addFeedCommentInSupabase,
  syncUserLocalPostsToSupabase,
  voteFeedPollInSupabase,
  ExtendedPost
} from '../../lib/feedService';
import {
  canAddFeedAttachments,
  getPostAttachments,
  MAX_FEED_ATTACHMENTS,
  UploadedFeedAttachment,
  uploadFeedAttachmentFile
} from '../../lib/feedAttachments';

const FEED_REACTIONS: Array<{ key: FeedReactionKey; emoji: string; labelEn: string; labelAr: string }> = [
  { key: 'heart', emoji: '❤️', labelEn: 'Love', labelAr: 'محبة' },
  { key: 'candle', emoji: '🕯️', labelEn: 'Prayer', labelAr: 'صلاة' },
  { key: 'cross', emoji: '✝️', labelEn: 'Faith', labelAr: 'إيمان' },
  { key: 'pray', emoji: '🙏', labelEn: 'Praying', labelAr: 'بصلي' },
  { key: 'laugh', emoji: '😂', labelEn: 'Joy', labelAr: 'فرح' },
  { key: 'wow', emoji: '😮', labelEn: 'Wow', labelAr: 'مندهش' },
  { key: 'clap', emoji: '👏', labelEn: 'Well done', labelAr: 'برافو' },
  { key: 'fire', emoji: '🔥', labelEn: 'Inspiring', labelAr: 'ملهم' },
  { key: 'dove', emoji: '🕊️', labelEn: 'Peace', labelAr: 'سلام' },
  { key: 'star', emoji: '⭐', labelEn: 'Wonderful', labelAr: 'رائع' }
];

type SortOption = 'latest' | 'popular' | 'discussed' | 'announcements' | 'saved';

const FEED_STORAGE_KEY = 'orthodox_church_feed_posts_v5';

type ComposerAttachment = UploadedFeedAttachment & {
  localPreviewUrl?: string;
  isExternal?: boolean;
  isVoiceRecording?: boolean;
  includeInGlobalPlayer?: boolean;
  globalAudioTitle?: string;
};

export function FeedTab({ lang, initialPostId, initialProfileId }: { lang: Language; initialPostId?: string | null; initialProfileId?: string | null }) {
  const { userData } = useAuth();
  const workspace = useActiveWorkspace();
  const isCop = lang === 'copt' || lang === 'cop';
  const isTeacher = workspace === 'teacher';
  
  const [posts, setPosts] = useState<ExtendedPost[]>([]);
  const [hasLoadedFeed, setHasLoadedFeed] = useState(false);
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const [feedResultScope, setFeedResultScope] = useState<string | null>(null);

  // Cache only after the server has supplied authoritative feed content.
  useEffect(() => {
    if (!hasLoadedFeed) return;
    try {
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      console.error('Failed to cache feed posts locally', e);
    }
  }, [posts, hasLoadedFeed]);

  useEffect(() => {
    if (!initialPostId || !hasLoadedFeed) return;
    const target = document.getElementById(`feed-post-${initialPostId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-[var(--mousa-gold)]');
      window.setTimeout(() => target.classList.remove('ring-2', 'ring-[var(--mousa-gold)]'), 2200);
    }
  }, [initialPostId, hasLoadedFeed, posts]);

  // Server state & notifications
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reactionPickerTarget, setReactionPickerTarget] = useState<string | null>(null);
  const [myPostReactionKeys, setMyPostReactionKeys] = useState<Set<string>>(() => new Set());
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'inappropriate' | 'privacy' | 'other'>('inappropriate');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const reportingPost = posts.find(post => post.id === reportingPostId) || null;
  const [isLoadingServerPosts, setIsLoadingServerPosts] = useState(true);
  const [feedLoadError, setFeedLoadError] = useState<string | null>(null);
  const postIdsKey = useMemo(() => posts.map(post => post.id).join('|'), [posts]);
  useEffect(() => {
    if (!supabase || !userData?.id || !postIdsKey) {
      setMyPostReactionKeys(new Set());
      return;
    }
    let active = true;
    supabase.from('feed_reactions').select('post_id,reaction_type').eq('user_id', userData.id).not('post_id', 'is', null)
      .then(({ data, error }) => {
        if (!active || error) return;
        setMyPostReactionKeys(new Set((data || []).filter(row => row.post_id).map(row => String(row.post_id) + ':' + String(row.reaction_type))));
      });
    return () => { active = false; };
  }, [userData?.id, postIdsKey]);

  useEffect(() => {
    if (!reactionPickerTarget) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-feed-reaction-root]')) {
        setReactionPickerTarget(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReactionPickerTarget(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [reactionPickerTarget]);


  // Load authoritative posts from Supabase on mount & run safe idempotent migration
  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setIsLoadingServerPosts(true);
      setFeedLoadError(null);
      setHasLoadedFeed(false);
      setPosts([]);

      // If user is authenticated, check for any unmigrated authentic local posts
      if (userData?.id) {
        try {
          const migRes = await syncUserLocalPostsToSupabase(userData);
          if (migRes.migratedCount > 0) {
            setSyncStatusText(
              lang === 'ar'
                ? `✨ تمت مزامنة ${migRes.migratedCount} منشور خاص بك مع سحابة الكنيسة بنجاح`
                : `✨ Successfully synced ${migRes.migratedCount} of your posts to church cloud`
            );
            setTimeout(() => setSyncStatusText(null), 6000);
          }
        } catch (migErr) {
          console.warn('Note on local feed migration:', migErr);
        }
      }

      const res = await fetchFeedPostsFromSupabase();
      if (!isMounted) return;
      setIsLoadingServerPosts(false);

      if (res.error || !res.data) {
        setFeedLoadError(res.error?.message ? getLocalizedErrorMessage(res.error.message, lang) : (lang === 'ar' ? 'مش قادرين نحمّل منشورات المجتمع دلوقتي.' : 'The community feed could not be loaded.'));
        setFeedResultScope(userData?.id || 'guest');
        return;
      }

      setFeedLoadError(null);
      setPosts(res.data);
      setHasLoadedFeed(true);
      setFeedResultScope(userData?.id || 'guest');
    }

    loadFeed().catch(error => {
      if (!isMounted) return;
      setIsLoadingServerPosts(false);
      setFeedLoadError(getLocalizedErrorMessage(error, lang) || (lang === 'ar' ? 'مش قادرين نحمّل منشورات المجتمع دلوقتي.' : 'The community feed could not be loaded.'));
      setFeedResultScope(userData?.id || 'guest');
    });

    return () => { isMounted = false; };
  }, [userData?.id, lang, feedReloadKey]);

  useEffect(() => {
    let active = true;
    if (!supabase || !userData?.id) { setBookmarkedPostIds(new Set()); return; }
    void supabase.from('feed_post_bookmarks').select('post_id').eq('user_id', userData.id)
      .then(({ data, error }) => {
        if (!active || error) return;
        setBookmarkedPostIds(new Set((data || []).map((row: any) => row.post_id)));
      });
    return () => { active = false; };
  }, [userData?.id]);

  const retryFeedLoad = () => {
    setFeedLoadError(null);
    setIsLoadingServerPosts(true);
    setFeedReloadKey(key => key + 1);
  };
  const isFeedLoading = isLoadingServerPosts || feedResultScope !== (userData?.id || 'guest');

  // 2. State controls
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(() => new Set());
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; replyToAuthor?: string } | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [isOfficialAnnouncement, setIsOfficialAnnouncement] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['','']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [targetClassesEnabled, setTargetClassesEnabled] = useState(false);
  const [availableTargetClasses, setAvailableTargetClasses] = useState<Array<{id:string;nameEn:string;nameAr:string;classGroupId:string}>>([]);
  const [targetGradesEnabled, setTargetGradesEnabled] = useState(false);
  const [selectedTargetGradeGroups, setSelectedTargetGradeGroups] = useState<string[]>([]);
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
  const [loadingTargetClasses, setLoadingTargetClasses] = useState(false);

  useEffect(() => {
    if (!isComposeModalOpen || !userData?.id || !supabase) return;
    let cancelled = false;
    const loadAllowedClasses = async () => {
      setLoadingTargetClasses(true);
      try {
        const { data: year } = await supabase!.from('church_years').select('id').eq('is_active', true).maybeSingle();
        if (!year?.id) { if (!cancelled) setAvailableTargetClasses([]); return; }
        let ids: string[] = [];
        if (userData.roles?.includes('admin')) {
          const { data } = await supabase!.from('class_instances').select('id').eq('church_year_id', year.id);
          ids = (data || []).map(row => row.id);
        } else if (isTeacher) {
          const { data } = await supabase!.from('servant_class_assignments').select('class_instance_id').eq('servant_id', userData.id).eq('church_year_id', year.id).eq('is_active', true);
          ids = (data || []).map(row => row.class_instance_id);
        } else {
          const { data } = await supabase!.from('class_memberships').select('class_instance_id').eq('student_id', userData.id).eq('church_year_id', year.id).eq('status', 'active');
          ids = (data || []).map(row => row.class_instance_id);
        }
        const uniqueIds = Array.from(new Set(ids));
        if (!uniqueIds.length) { if (!cancelled) setAvailableTargetClasses([]); return; }
        const { data: classes } = await supabase!.from('class_instances') .select('id,name_en,name_ar,class_group_id').in('id', uniqueIds).order('name_en');
        if (!cancelled) setAvailableTargetClasses((classes || []).map(row => ({id:row.id,nameEn:row.name_en,nameAr:row.name_ar,classGroupId:row.class_group_id})));
      } catch (error) {
        console.warn('Could not load authorized feed audience classes:', error);
        if (!cancelled) setAvailableTargetClasses([]);
      } finally { if (!cancelled) setLoadingTargetClasses(false); }
    };
    void loadAllowedClasses();
    return () => { cancelled = true; };
  }, [isComposeModalOpen, userData?.id, isTeacher]);

  // Cloud Storage status & diagnostic modal
  const [storageStatus, setStorageStatus] = useState<{
    configured: boolean;
    provider: string;
    bucket: string;
    publicDomain: string;
    unlimited: boolean;
    notes: string;
  } | null>(null);

  // Check cloud storage status on mount
  useEffect(() => {
    checkStorageBackendStatus().then(status => {
      setStorageStatus(status);
    });
  }, []);

  // Media state for compose
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [lightboxAttachment, setLightboxAttachment] = useState<FeedAttachment | null>(null);
  const [lightboxGallery, setLightboxGallery] = useState<FeedAttachment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxScale, setLightboxScale] = useState(1);
  const lightboxTouchStartRef = useRef<number | null>(null);
  const [missingMediaIds, setMissingMediaIds] = useState<Set<string>>(() => new Set());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const postDraftIdRef = useRef<string | null>(null);
  const composerAttachmentsRef = useRef<ComposerAttachment[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const waveformContextRef = useRef<AudioContext | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const isUnmountingRef = useRef(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isVoiceRecordingPaused, setIsVoiceRecordingPaused] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() => Array(32).fill(0.08));

  useEffect(() => {
    composerAttachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  useEffect(() => () => {
    composerAttachmentsRef.current.forEach(attachment => {
      if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    });
  }, []);

  useEffect(() => () => {
    isUnmountingRef.current = true;
    if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current);
    if (waveformContextRef.current) void waveformContextRef.current.close();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const openPostMedia = (post: ExtendedPost, attachment: FeedAttachment) => {
    const gallery = getPostAttachments(post).filter(item => item.mediaType === 'image' || item.mediaType === 'video');
    const index = gallery.findIndex(item => item.id === attachment.id);
    setLightboxGallery(gallery.length ? gallery : [attachment]);
    setLightboxIndex(Math.max(0, index));
    setLightboxScale(1);
    setLightboxAttachment(attachment);
  };

  const navigateLightbox = (direction: -1 | 1) => {
    if (lightboxGallery.length < 2) return;
    const nextIndex = (lightboxIndex + direction + lightboxGallery.length) % lightboxGallery.length;
    setLightboxIndex(nextIndex);
    setLightboxAttachment(lightboxGallery[nextIndex]);
    setLightboxScale(1);
  };

  const saveLightboxMedia = async () => {
    if (!lightboxAttachment) return;
    const media = lightboxAttachment;
    try {
      const response = await fetch(media.mediaUrl);
      if (!response.ok) throw new Error('Media download failed');
      const blob = await response.blob();
      const filename = media.originalFilename || `anba-mousa-${Date.now()}.${media.mediaType === 'video' ? 'mp4' : 'jpg'}`;
      const file = new File([blob], filename, { type: blob.type || (media.mediaType === 'video' ? 'video/mp4' : 'image/jpeg') });
      const shareNavigator = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
      if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
        await shareNavigator.share({ files: [file], title: filename });
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      window.open(media.mediaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const availableTargetGradeGroups = userData?.roles?.includes('admin')
    ? Object.keys(CLASS_GROUPS)
    : Array.from(new Set(availableTargetClasses.map(item => item.classGroupId)));

  // 3. Sorting logic
  const sortedPosts = useMemo(() => {
    const list = [...posts];

    switch (sortBy) {
      case 'saved':
        return list.filter(post => bookmarkedPostIds.has(post.id));

      case 'announcements':
        return list.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.isAnnouncement && !b.isAnnouncement) return -1;
          if (!a.isAnnouncement && b.isAnnouncement) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      case 'popular':
        return list.sort((a, b) => {
          const aTotal = a.reactions.heart + a.reactions.candle + a.reactions.cross;
          const bTotal = b.reactions.heart + b.reactions.candle + b.reactions.cross;
          return bTotal - aTotal;
        });

      case 'discussed':
        return list.sort((a, b) => {
          const aComments = a.comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
          const bComments = b.comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
          return bComments - aComments;
        });

      case 'latest':
      default:
        return list.sort((a, b) => {
          // Pinned posts always stay on top for visibility
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }
  }, [posts, sortBy, bookmarkedPostIds]);

  const submitPostReport = async () => {
    if (!supabase || !userData?.id || !reportingPost) {
      setActionError(lang === 'ar' ? 'سجّل الدخول لإرسال البلاغ.' : 'Sign in to submit a report.');
      return;
    }
    if (reportingPost.authorId === userData.id) {
      setActionError(lang === 'ar' ? 'لا يمكنك الإبلاغ عن منشورك.' : 'You cannot report your own post.');
      return;
    }
    setReportBusy(true);
    setActionError(null);
    const { data, error } = await supabase.rpc('submit_feed_post_report', {
      p_post_id: reportingPost.id,
      p_reason: reportReason,
      p_details: reportDetails.trim() || null
    });
    setReportBusy(false);
    if (error || data?.already_reported || !data?.success) {
      setActionError(data?.already_reported
        ? (lang === 'ar' ? 'أرسلت بلاغاً عن المنشور ده بالفعل.' : 'You have already reported this post.')
        : (lang === 'ar' ? 'تعذر إرسال البلاغ. حاول مرة أخرى.' : 'The report could not be submitted. Please try again.'))
      return;
    }
    setReportingPostId(null);
    setReportDetails('');
    setSyncStatusText(lang === 'ar' ? 'تم إرسال البلاغ بسرية إلى فريق الخدمة للمراجعة.' : 'Your report was privately sent to the church team for review.');
    window.setTimeout(() => setSyncStatusText(null), 5000);
  };

  // Reactions are server-authoritative. Serialize taps per post+emoji so rapid
  // taps cannot race two toggle RPCs and leave the UI count out of sync.
  const reactionInFlightRef = useRef(new Set<string>());
  const handleReactPost = async (postId: string, reactionType: FeedReactionKey) => {
    const lockKey = `post:${postId}:${reactionType}`;
    if (reactionInFlightRef.current.has(lockKey)) return;
    reactionInFlightRef.current.add(lockKey);
    setActionError(null);
    try {
      const res = await toggleFeedReactionInSupabase(reactionType, { postId });
      if (res.error || !res.action) throw res.error || new Error('Reaction was not confirmed.');
      const delta = res.action === 'added' ? 1 : res.action === 'removed' ? -1 : 0;
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        reactions: { ...p.reactions, [reactionType]: Math.max(0, (p.reactions[reactionType] || 0) + delta) }
      } : p));
      setMyPostReactionKeys(previous => {
        const next = new Set(previous);
        const key = `${postId}:${reactionType}`;
        if (res.action === 'added') next.add(key);
        else if (res.action === 'removed') next.delete(key);
        return next;
      });
    } catch (error) {
      console.warn('Reaction write note:', error);
      setActionError(lang === 'ar'
        ? `مش قادرين نسجّل التفاعل دلوقتي: ${getLocalizedErrorMessage(error instanceof Error ? error.message : '', lang)}`
        : `Reaction failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      reactionInFlightRef.current.delete(lockKey);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!supabase || !userData?.id) {
      setActionError(lang === 'ar' ? 'سجّل الدخول لحفظ المنشورات.' : 'Sign in to save posts.');
      return;
    }
    const wasSaved = bookmarkedPostIds.has(postId);
    setBookmarkedPostIds(previous => {
      const next = new Set(previous);
      if (wasSaved) next.delete(postId); else next.add(postId);
      return next;
    });
    const result = wasSaved
      ? await supabase.from('feed_post_bookmarks').delete().eq('user_id', userData.id).eq('post_id', postId)
      : await supabase.from('feed_post_bookmarks').insert({ user_id: userData.id, post_id: postId });
    if (result.error) {
      setBookmarkedPostIds(previous => {
        const next = new Set(previous);
        if (wasSaved) next.add(postId); else next.delete(postId);
        return next;
      });
      setActionError(lang === 'ar' ? 'تعذر حفظ المنشور. حاول مرة أخرى.' : 'Could not update saved posts. Please try again.');
    }
  };

  const handleSharePost = async (post: Post) => {
    const shareText = (post.content || '').trim().slice(0, 220);
    const shareUrl = typeof window !== 'undefined' ? (() => { const url = new URL(window.location.href); url.searchParams.set('tab', 'feed'); url.searchParams.set('post', post.id); url.hash = `post-${post.id}`; return url.toString(); })() : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Anba Mousa Community', text: shareText, url: shareUrl });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText([shareText, shareUrl].filter(Boolean).join('\n\n'));
        setActionError(lang === 'ar' ? 'تم نسخ المنشور لمشاركته.' : 'Post text and feed link copied to share.');
      } else {
        setActionError(lang === 'ar' ? 'المشاركة غير متاحة على هذا الجهاز.' : 'Sharing is not available on this device.');
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        setActionError(lang === 'ar' ? 'تعذرت مشاركة المنشور.' : 'Could not share this post.');
      }
    }
  };

  const handleReactComment = async (postId: string, commentId: string, reactionType: FeedReactionKey) => {
    const lockKey = `comment:${commentId}:${reactionType}`;
    if (reactionInFlightRef.current.has(lockKey)) return;
    reactionInFlightRef.current.add(lockKey);
    setActionError(null);
    try {
      const res = await toggleFeedReactionInSupabase(reactionType, { commentId });
      if (res.error || !res.action) throw res.error || new Error('Reaction was not confirmed.');
      const delta = res.action === 'added' ? 1 : res.action === 'removed' ? -1 : 0;
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        comments: p.comments.map(comment => comment.id === commentId ? {
          ...comment,
          reactions: {
            ...(comment.reactions || { heart: 0, candle: 0, cross: 0 }),
            [reactionType]: Math.max(0, ((comment.reactions || { heart: 0, candle: 0, cross: 0 })[reactionType] || 0) + delta)
          }
        } : comment)
      } : p));
    } catch (error) {
      console.warn('Comment reaction write note:', error);
      setActionError(lang === 'ar'
        ? `مش قادرين نسجّل التفاعل: ${getLocalizedErrorMessage(error instanceof Error ? error.message : '', lang)}`
        : `Comment reaction failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      reactionInFlightRef.current.delete(lockKey);
    }
  };

  // 6. Reply Reactions
  const handleReactReply = async (postId: string, commentId: string, replyId: string, reactionType: FeedReactionKey) => {
    // New replies use a temporary id until the server confirms their insert.
    if (replyId.startsWith('rep-')) return;
    const lockKey = `reply:${replyId}:${reactionType}`;
    if (reactionInFlightRef.current.has(lockKey)) return;
    reactionInFlightRef.current.add(lockKey);
    setActionError(null);
    try {
      const res = await toggleFeedReactionInSupabase(reactionType, { commentId: replyId });
      if (res.error || !res.action) throw res.error || new Error('Reaction was not confirmed.');
      const delta = res.action === 'added' ? 1 : res.action === 'removed' ? -1 : 0;
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        comments: post.comments.map(comment => comment.id === commentId ? {
          ...comment,
          replies: comment.replies.map(reply => reply.id === replyId ? {
            ...reply,
            reactions: {
              ...(reply.reactions || { heart: 0, candle: 0, cross: 0 }),
              [reactionType]: Math.max(0, (reply.reactions?.[reactionType] || 0) + delta)
            }
          } : reply)
        } : comment)
      } : post));
    } catch (error) {
      console.warn('Reply reaction write note:', error);
      setActionError(lang === 'ar'
        ? `مش قادرين نسجّل التفاعل: ${getLocalizedErrorMessage(error instanceof Error ? error.message : '', lang)}`
        : `Reply reaction failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      reactionInFlightRef.current.delete(lockKey);
    }
  };

  // 7. Add Comment or Reply (Optimistic update with Supabase persistence & rollback)
  const handleAddCommentOrReply = async (postId: string) => {
    if (!replyText.trim() || !userData) return;
    setActionError(null);

    const tempId = (replyTarget ? 'rep-' : 'cmt-') + Date.now().toString();
    const content = replyTarget?.replyToAuthor 
      ? `@${replyTarget.replyToAuthor} ${replyText.trim()}` 
      : replyText.trim();
    const authorName = userData.fullName + (isTeacher ? ` (${lang === 'ar' ? 'خادم' : 'Servant'})` : '');
    const authorAvatar = userData.avatarUrl;

    const previousPosts = posts;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        if (replyTarget) {
          const newReply: Reply = {
            id: tempId,
            authorName,
            authorAvatar,
            content,
            createdAt: new Date().toISOString(),
            reactions: { heart: 0, candle: 0, cross: 0 }
          };
          return {
            ...p,
            comments: p.comments.map(c => {
              if (c.id === replyTarget.commentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), newReply]
                };
              }
              return c;
            })
          };
        } else {
          const newComment: Comment = {
            id: tempId,
            authorName,
            authorAvatar,
            content,
            createdAt: new Date().toISOString(),
            reactions: { heart: 0, candle: 0, cross: 0 },
            replies: []
          };
          return {
            ...p,
            comments: [...p.comments, newComment]
          };
        }
      }
      return p;
    }));

    setReplyText("");
    const targetParentId = replyTarget?.commentId;
    setReplyTarget(null);

    const res = await addFeedCommentInSupabase({
      postId,
      parentId: targetParentId,
      authorId: userData.id,
      authorName,
      authorAvatar,
      content
    });

    if (res.error) {
      console.warn('Comment write error:', res.error);
      setActionError(lang === 'ar' ? `مش قادرين نحفظ التعليق دلوقتي: ${getLocalizedErrorMessage(res.error.message, lang)}` : `Failed to save comment to cloud: ${res.error.message}`);
      setPosts(previousPosts);
    } else if (res.data?.id) {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          if (targetParentId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === targetParentId) {
                  return {
                    ...c,
                    replies: (c.replies || []).map(r => r.id === tempId ? { ...r, id: res.data!.id } : r)
                  };
                }
                return c;
              })
            };
          } else {
            return {
              ...p,
              comments: p.comments.map(c => c.id === tempId ? { ...c, id: res.data!.id } : c)
            };
          }
        }
        return p;
      }));
    }
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = [];
    if (fileList) {
      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList.item(index);
        if (file) files.push(file);
      }
    }
    e.target.value = '';
    if (files.length === 0 || !userData) return;
    if (!canAddFeedAttachments(composerAttachments.length, files.length)) {
      setMediaError(lang === 'ar'
        ? `تقدر ترفق ${MAX_FEED_ATTACHMENTS} ملفات بالكتير في المنشور الواحد.`
        : `You can attach up to ${MAX_FEED_ATTACHMENTS} files to one post.`);
      return;
    }

    setMediaError(null);
    setShowLinkInput(false);
    setIsUploadingMedia(true);
    const queued = files.map(file => {
      const localPreviewUrl = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mediaType: (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image') as ComposerAttachment['mediaType'],
        mediaUrl: localPreviewUrl,
        localPreviewUrl,
        originalFilename: file.name,
        byteSize: file.size,
        file,
        status: 'uploading' as const
      };
    });
    setComposerAttachments(previous => [...previous, ...queued]);

    try {
      for (let index = 0; index < queued.length; index += 1) {
        const item = queued[index];
        setUploadStatusText(lang === 'ar'
          ? `بنرفع الملف ${index + 1} من ${queued.length}...`
          : `Uploading file ${index + 1} of ${queued.length}...`);
        const result = await uploadFeedAttachmentFile(item.file!, userData.id, uploadFeedMediaToSupabase);
        setComposerAttachments(previous => previous.map(current => {
          if (current.id !== item.id) return current;
          if (result.error || !result.data) {
            return { ...current, status: 'error', error: result.error?.message || (lang === 'ar' ? 'مش قادرين نرفع الملف.' : 'Upload failed.') };
          }
          URL.revokeObjectURL(current.localPreviewUrl || '');
          return { ...result.data, isVoiceRecording: current.isVoiceRecording, includeInGlobalPlayer: current.includeInGlobalPlayer, globalAudioTitle: current.globalAudioTitle, localPreviewUrl: undefined };
        }));
      }
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
    }
  };

  const uploadVoiceRecording = async (file: File) => {
    if (!userData) return;
    if (!canAddFeedAttachments(composerAttachmentsRef.current.length, 1)) {
      setMediaError(lang === 'ar' ? `تقدر ترفق ${MAX_FEED_ATTACHMENTS} ملفات بالكتير في المنشور الواحد.` : `You can attach up to ${MAX_FEED_ATTACHMENTS} files to one post.`);
      return;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    const attachmentId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pending: ComposerAttachment = {
      id: attachmentId, mediaType: 'audio', mediaUrl: localPreviewUrl, localPreviewUrl,
      originalFilename: file.name, mimeType: file.type, byteSize: file.size, file,
      status: 'uploading', isVoiceRecording: true, includeInGlobalPlayer: false
    };
    setComposerAttachments(previous => [...previous, pending]);
    setIsUploadingMedia(true);
    setUploadStatusText(lang === 'ar' ? 'بنرفع التسجيل الصوتي...' : 'Uploading voice recording...');
    try {
      const result = await uploadFeedAttachmentFile(file, userData.id, uploadFeedMediaToSupabase);
      setComposerAttachments(previous => previous.map(current => {
        if (current.id !== attachmentId) return current;
        if (result.error || !result.data) {
          return { ...current, status: 'error', error: result.error?.message || (lang === 'ar' ? 'فشل رفع التسجيل.' : 'Recording upload failed.') };
        }
        URL.revokeObjectURL(current.localPreviewUrl || '');
        return { ...result.data, isVoiceRecording: true, includeInGlobalPlayer: false, globalAudioTitle: '', localPreviewUrl: undefined };
      }));
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
    }
  };

  const stopVoiceWaveform = () => {
    if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current);
    waveformFrameRef.current = null;
    waveformAnalyserRef.current = null;
    const context = waveformContextRef.current;
    waveformContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
    setWaveformLevels(Array(32).fill(0.08));
  };

  const startVoiceWaveform = (stream: MediaStream) => {
    if (typeof AudioContext === 'undefined') return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    context.createMediaStreamSource(stream).connect(analyser);
    // Keep the analyser graph alive without monitoring microphone audio through speakers.
    const silentOutput = context.createGain();
    silentOutput.gain.value = 0;
    analyser.connect(silentOutput);
    silentOutput.connect(context.destination);
    waveformContextRef.current = context;
    waveformAnalyserRef.current = analyser;
    void context.resume().catch(() => undefined);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      if (waveformAnalyserRef.current !== analyser) return;
      if (mediaRecorderRef.current?.state === 'paused') {
        setWaveformLevels(Array(32).fill(0.08));
        waveformFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      analyser.getByteFrequencyData(bins);
      frame += 1;
      if (frame % 3 === 0) {
        const levels = Array.from({ length: 32 }, (_, index) => {
          const value = bins[Math.min(bins.length - 1, Math.floor(index * bins.length / 32))] / 255;
          return Math.max(0.08, Math.min(1, value * 2.8));
        });
        setWaveformLevels(levels);
      }
      waveformFrameRef.current = requestAnimationFrame(draw);
    };
    waveformFrameRef.current = requestAnimationFrame(draw);
  };

  const startVoiceRecording = async () => {
    if (!userData) {
      setMediaError(lang === 'ar' ? 'سجّل دخولك الأول عشان تسجّل وتنشر صوتك.' : 'Sign in before recording and publishing audio.');
      return;
    }
    if (isRecordingVoice || isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaError(lang === 'ar' ? 'تسجيل الصوت غير مدعوم في هذا المتصفح.' : 'Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const recordingChunks: Blob[] = [];
      recordingChunksRef.current = recordingChunks;
      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
        : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) recordingChunks.push(event.data);
      };
      recorder.onerror = () => setMediaError(lang === 'ar' ? 'حصلت مشكلة أثناء التسجيل.' : 'The recording encountered an error.');
      recorder.onpause = () => setIsVoiceRecordingPaused(true);
      recorder.onresume = () => setIsVoiceRecordingPaused(false);
      recorder.onstop = () => {
        stopVoiceWaveform();
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        setIsRecordingVoice(false);
        setIsVoiceRecordingPaused(false);
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(recordingChunks, { type });
        recordingChunksRef.current = [];
        if (isUnmountingRef.current) return;
        if (!blob.size) {
          setMediaError(lang === 'ar' ? 'لم يلتقط التسجيل أي صوت. تأكد من إذن الميكروفون وحاول مرة أخرى.' : 'No audio was captured. Check microphone permission and try again.');
          return;
        }
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        void uploadVoiceRecording(new File([blob], `voice-recording-${Date.now()}.${extension}`, { type }));
      };
      // IMPORTANT: start() must be executable code, not part of this comment.
      recorder.start(250);
      startVoiceWaveform(stream);
      setMediaError(null);
      setIsVoiceRecordingPaused(false);
      setIsRecordingVoice(true);
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
      setMediaError(error instanceof Error ? error.message : (lang === 'ar' ? 'مش قادرين نفتح الميكروفون.' : 'Could not access the microphone.'));
    }
  };

  const pauseOrResumeVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setMediaError(lang === 'ar' ? 'لا يوجد تسجيل نشط لإيقافه مؤقتًا.' : 'There is no active recording to pause or resume.');
      return;
    }
    try {
      if (recorder.state === 'recording') recorder.pause();
      else if (recorder.state === 'paused') recorder.resume();
      else setMediaError(lang === 'ar' ? 'انتظر لحظة حتى يبدأ التسجيل.' : 'Please wait for recording to become ready.');
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : (lang === 'ar' ? 'تعذر إيقاف التسجيل مؤقتًا.' : 'Could not pause or resume the recording.'));
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setMediaError(lang === 'ar' ? 'لا يوجد تسجيل نشط لإنهائه.' : 'There is no active recording to finish.');
      return;
    }
    try {
      // MediaRecorder.stop() dispatches the final dataavailable event before onstop,
      // including when the recorder is paused. Do not requestData() while paused.
      recorder.stop();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : (lang === 'ar' ? 'تعذر إنهاء التسجيل.' : 'Could not finish the recording.'));
    }
  };

  const retryComposerAttachment = async (id: string) => {
    const item = composerAttachments.find(attachment => attachment.id === id);
    if (!item?.file || !userData || isUploadingMedia) return;
    setMediaError(null);
    setIsUploadingMedia(true);
    setComposerAttachments(previous => previous.map(current =>
      current.id === id ? { ...current, status: 'uploading', error: undefined } : current
    ));
    try {
      const result = await uploadFeedAttachmentFile(item.file, userData.id, uploadFeedMediaToSupabase);
      setComposerAttachments(previous => previous.map(current => {
        if (current.id !== id) return current;
        if (result.error || !result.data) {
          return { ...current, status: 'error', error: result.error?.message || (lang === 'ar' ? 'مش قادرين نرفع الملف.' : 'Upload failed.') };
        }
        URL.revokeObjectURL(current.localPreviewUrl || '');
        return { ...result.data, localPreviewUrl: undefined };
      }));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeComposerAttachment = async (id: string) => {
    const item = composerAttachments.find(attachment => attachment.id === id);
    if (!item) return;
    setComposerAttachments(previous => previous.filter(attachment => attachment.id !== id));
    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
    if (item.storageReference) {
      const cleanup = await cleanupFeedMediaReferences([item.storageReference]);
      if (cleanup.error) {
        setMediaError(lang === 'ar'
          ? `الملف اتشال من المنشور، لكن مش قادرين نمسح الملف المرفوع: ${getLocalizedErrorMessage(cleanup.error.message, lang)}`
          : `The attachment was removed, but the uploaded file could not be cleaned up: ${cleanup.error.message}`);
      }
    }
  };

  const clearComposerAttachments = async (): Promise<Error | null> => {
    const references = composerAttachments
      .map(attachment => attachment.storageReference)
      .filter((reference): reference is string => Boolean(reference));
    composerAttachments.forEach(attachment => {
      if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    });
    setComposerAttachments([]);
    if (references.length > 0) {
      const cleanup = await cleanupFeedMediaReferences(references);
      return cleanup.error;
    }
    return null;
  };

  const handleApplyLink = () => {
    if (!linkInputValue.trim()) return;
    if (!canAddFeedAttachments(composerAttachments.length, 1)) {
      setMediaError(lang === 'ar'
        ? `تقدر ترفق ${MAX_FEED_ATTACHMENTS} ملفات بالكتير في المنشور الواحد.`
        : `You can attach up to ${MAX_FEED_ATTACHMENTS} files to one post.`);
      return;
    }
    const parsed = extractEmbedMedia(linkInputValue.trim());
    if (parsed.mediaType !== 'unknown') {
      setComposerAttachments(previous => [...previous, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mediaType: parsed.mediaType,
        mediaUrl: parsed.embedUrl,
        mediaProvider: 'external-stream',
        status: 'ready',
        isExternal: true
      }]);
      setMediaError(null);
      setLinkInputValue('');
      setShowLinkInput(false);
    } else {
      setMediaError(lang === 'ar' ? 'اكتب رابط صحيح ليوتيوب أو جوجل درايف أو ملف فيديو أو صوت.' : 'Please enter a valid YouTube, Google Drive, video or audio link');
    }
  };

  const handleCloseComposer = async () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
      return;
    }
    if (isUploadingMedia || isCreatingPost) return;
    setMediaError(null);
    const cleanupError = await clearComposerAttachments();
    if (cleanupError) {
      setActionError(lang === 'ar'
        ? `المنشور اتقفل، لكن مش قادرين نمسح بعض الملفات المرفوعة: ${cleanupError.message}`
        : `The composer was closed, but some uploaded files could not be cleaned up: ${cleanupError.message}`);
    }
    setLinkInputValue('');
    setShowLinkInput(false);
    setIsComposeModalOpen(false);
  };

  // 8. Create New Post only after the server confirms the post and its attachments.
  const handleCreatePost = async () => {
    if ((!newPostText.trim() && composerAttachments.length === 0 && !pollEnabled) || !userData || isCreatingPost) return;
    if (pollEnabled && (pollQuestion.trim().length < 2 || pollOptions.filter(option => option.trim()).length < 2)) {
      setMediaError(lang === 'ar' ? 'أضف سؤالاً وخيارين على الأقل للاستطلاع.' : 'Add a poll question and at least two answer options.');
      return;
    }
    if (composerAttachments.some(attachment => attachment.status !== 'ready')) {
      setMediaError(lang === 'ar' ? 'استنى لحد ما الملفات تترفع، أو جرّب ترفع تاني الملفات اللي حصل فيها مشكلة.' : 'Finish or retry every attachment upload before publishing.');
      return;
    }
    if (composerAttachments.some(attachment => attachment.isVoiceRecording && attachment.includeInGlobalPlayer && !attachment.globalAudioTitle?.trim())) {
      setMediaError(lang === 'ar' ? 'اكتب اسم التسجيل قبل إضافته للمشغل العام.' : 'Add a title before sending this recording to the global player.');
      return;
    }
    setActionError(null);
    const authorName = userData.fullName + (isTeacher ? ` (${lang === 'ar' ? 'خادم' : 'Servant'})` : '');
    const authorAvatar = userData.avatarUrl || DEFAULT_STUDENT_AVATAR;
    const attachments: FeedPostAttachmentInput[] = composerAttachments.map(attachment => ({
      mediaType: attachment.mediaType,
      mediaUrl: attachment.mediaUrl,
      storageReference: attachment.storageReference,
      mediaProvider: attachment.mediaProvider,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      byteSize: attachment.byteSize,
      includeInGlobalPlayer: Boolean(attachment.isVoiceRecording && attachment.includeInGlobalPlayer),
      globalAudioTitle: attachment.isVoiceRecording && attachment.includeInGlobalPlayer ? attachment.globalAudioTitle?.trim() : undefined
    }));
    const postPinned = isTeacher && isOfficialAnnouncement;
    const postId = postDraftIdRef.current || `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    postDraftIdRef.current = postId;
    setIsCreatingPost(true);
    try {
      const res = await createFeedPostInSupabase({
        id: postId,
        authorId: userData.id,
        authorName,
        authorAvatar,
        content: newPostText.trim(),
        attachments,
        isPinned: postPinned,
        isAnnouncement: postPinned,
        targetClassIds: targetClassesEnabled ? selectedTargetClassIds : [],
        targetGradeGroups: targetGradesEnabled ? selectedTargetGradeGroups : [],
        poll: pollEnabled ? { question: pollQuestion, options: pollOptions.filter(option => option.trim()), allowMultiple: pollAllowMultiple } : undefined
      });

      if (res.error || !res.data) {
        const errorMessage = res.error?.message || 'The post was not confirmed by the server.';
        console.warn('Post creation error:', errorMessage);
        setActionError(lang === 'ar' ? `مش قادرين نحفظ المشاركة دلوقتي: ${errorMessage}` : `Failed to save post to cloud: ${errorMessage}`);
        return;
      }
      const refreshedFeed = await fetchFeedPostsFromSupabase();
      setPosts(refreshedFeed.data || [res.data!, ...posts]);
      setNewPostText('');
      setIsOfficialAnnouncement(false);
      setPollEnabled(false);
      setPollQuestion('');
      setPollOptions(['','']);
      setPollAllowMultiple(false);
      setTargetClassesEnabled(false);
      setSelectedTargetClassIds([]);
      setTargetGradesEnabled(false);
      setSelectedTargetGradeGroups([]);
      setShowLinkInput(false);
      setLinkInputValue('');
      setMediaError(null);
      composerAttachments.forEach(attachment => {
        if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      });
      setComposerAttachments([]);
      postDraftIdRef.current = null;
      setIsComposeModalOpen(false);
    } catch (error) {
      const errorMessage = getLocalizedErrorMessage(error, lang);
      setActionError(lang === 'ar' ? `مش قادرين نحفظ المشاركة: ${errorMessage}` : `Failed to save post: ${errorMessage}`);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm(lang === 'ar' ? 'متأكد إنك عايز تحذف المنشور ده؟' : 'Are you sure you want to delete this post?')) {
      return;
    }
    setActionError(null);
    const previousPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));

    const res = await deleteFeedPostFromSupabase(postId);
    if (res.error) {
      console.warn('Post deletion error:', res.error);
      setActionError(lang === 'ar' ? `مش قادرين نحذف المنشور: ${getLocalizedErrorMessage(res.error.message, lang)}` : `Failed to delete post: ${res.error.message}`);
      setPosts(previousPosts);
    }
  };

  const handleTogglePin = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;
    const nextPinned = !targetPost.isPinned;
    setActionError(null);

    const previousPosts = posts;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: nextPinned } : p));

    const res = await toggleFeedPostPinInSupabase(postId, nextPinned);
    if (res.error) {
      console.warn('Pin toggle error:', res.error);
      setActionError(lang === 'ar' ? `مش قادرين نغيّر تثبيت المنشور: ${getLocalizedErrorMessage(res.error.message, lang)}` : `Pin toggle failed: ${res.error.message}`);
      setPosts(previousPosts);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto space-y-6" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] md:text-3xl">
            {lang === 'ar' ? 'مجتمع كنيسة الأنبا موسى' : 'St. Moses Community Oasis'}
          </h1>
          <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
            {lang === 'ar' ? 'شارك تأملاتك وآياتك وتواصل مع عيلة مدارس الأحد' : 'Spiritual reflections, desert verses & Sunday School fellowship'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <FeedPeopleDirectory lang={lang} initialProfileId={initialProfileId} />
          {isTeacher && (
            <span className="bg-[var(--mousa-coral-soft)] text-[var(--mousa-coral-dark)] border border-[var(--mousa-coral)]/30 px-3 py-1 rounded-full text-xs font-black shadow-2xs flex items-center gap-1">
              <ShieldCheck size={14} />
              <span>{lang === 'ar' ? 'إشراف الخادم' : 'Moderator'}</span>
            </span>
          )}
          <div className="bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] border border-[var(--mousa-gold)]/30 px-3 py-1 rounded-full text-xs font-black shadow-2xs">
            {lang === 'ar' ? 'مراقب كنسياً' : 'Moderated'}
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusText && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncStatusText}</span>
          </div>
          <button 
            onClick={() => setSyncStatusText(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-black cursor-pointer px-2"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button 
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-black cursor-pointer px-2"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Compose trigger banner */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsComposeModalOpen(true)}
        className="bg-gradient-to-r from-[var(--mousa-teal-deep)] via-[#144E5B] to-[#103D46] border-2 border-[var(--mousa-gold)]/40 text-white p-4 md:p-5 rounded-3xl flex items-center gap-3.5 shadow-sm cursor-pointer"
      >
        <div className="bg-white/10 p-2.5 rounded-2xl shrink-0 border border-white/10">
          <Share2 size={24} className="text-[var(--mousa-gold-glow)]" />
        </div>
        <div className="flex-1">
          <p className="font-black text-sm md:text-base text-white">
            {isTeacher 
              ? (isCop ? 'Ϩⲓⲟⲩⲓ̀ ⲛ̀ⲟⲩⲧⲁⲙⲟ ⲛ̀ⲧⲉ ϯⲇⲓⲁⲕⲟⲛⲓⲁ ⲓⲉ ⲟⲩⲙⲉⲩⲓ' : lang === 'ar' ? 'انشر إعلان للخدمة أو شارك تأمل روحي' : 'Post Servant Announcement or Reflection') 
              : (isCop ? 'Ϣⲱⲡ ⲛ̀ⲟⲩⲣⲏϯ ⲓⲉ ⲟⲩⲙⲉⲩⲓ ⲛⲉⲙ ⲧⲉⲕⲉⲕⲕⲗⲏⲥⲓⲁ!' : lang === 'ar' ? 'شارك آية أو تأمل مع عيلتك في الكنيسة!' : 'Share a verse or reflection with church!')}
          </p>
          <p className="text-xs text-stone-200 mt-0.5">
            {isTeacher 
              ? (isCop ? 'Ⲙ̀ⲫⲣⲏϯ ⲛ̀ⲟⲩⲇⲓⲁⲕⲟⲛ, ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ⲧⲁϫⲣⲟ ⲛⲓⲧⲁⲙⲟ' : lang === 'ar' ? 'بصفتك خادماً، يمكنك تثبيت الإعلان وتوجيه الأبناء' : 'As a servant, you can pin announcements for students') 
              : (isCop ? 'Ⲛⲓϩⲓⲟⲩⲓ̀ ⲥⲉⲁⲣⲉϩ ⲉ̀ⲣⲱⲟⲩ ⲛⲉⲙ ϯⲡⲁⲧⲣⲓⲁ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ' : lang === 'ar' ? 'المنشورات يتم حفظها ومشاركتها مع أسرة الكنيسة' : 'Posts are saved and shared with your church family')}
          </p>
        </div>
        <button className="bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] text-white px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all shadow-xs pointer-events-none">
          {isCop ? 'Ϩⲓⲟⲩⲓ̀' : lang === 'ar' ? 'نشر' : 'Post'}
        </button>
      </motion.div>

      {/* Sort By Section */}
      <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] p-3 rounded-2xl border-2 border-[var(--mousa-border-sand)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black text-[var(--mousa-sand-500)]">
          <ArrowUpDown size={15} className="text-[var(--mousa-gold)]" />
          <span>{isCop ? 'Ⲧⲁⲝⲓⲥ ⲛ̀ⲛⲓϩⲓⲟⲩⲓ̀ ⲕⲁⲧⲁ:' : lang === 'ar' ? 'ترتيب المنشورات حسب:' : 'Sort Posts by:'}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === 'latest'
                ? 'bg-[var(--mousa-teal)] text-white shadow-xs'
                : 'bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:bg-[var(--mousa-sand-200)]'
            }`}
          >
            <Clock size={13} />
            <span>{isCop ? 'Ⲡⲓⲃⲉⲣⲓ' : lang === 'ar' ? 'الأحدث' : 'Latest'}</span>
          </button>

          <button
            onClick={() => setSortBy('popular')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === 'popular'
                ? 'bg-[var(--mousa-teal)] text-white shadow-xs'
                : 'bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:bg-[var(--mousa-sand-200)]'
            }`}
          >
            <Flame size={13} className="text-[var(--mousa-coral)]" />
            <span>{isCop ? 'Ⲡⲓϩⲟⲩⲟ̀ ⲛ̀ⲑⲣⲟⲩ' : lang === 'ar' ? 'الأكثر تفاعلاً' : 'Most Popular'}</span>
          </button>

          <button
            onClick={() => setSortBy('discussed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === 'discussed'
                ? 'bg-[var(--mousa-teal)] text-white shadow-xs'
                : 'bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:bg-[var(--mousa-sand-200)]'
            }`}
          >
            <MessageCircle size={13} />
            <span>{isCop ? 'Ⲡⲓϩⲟⲩⲟ̀ ⲛ̀ⲥⲁϫⲓ' : lang === 'ar' ? 'الأكثر تعليقاً' : 'Most Discussed'}</span>
          </button>

          {userData?.id && <button
            type="button"
            onClick={() => setSortBy('saved')}
            aria-pressed={sortBy === 'saved'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${sortBy === 'saved' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200'}`}
          >
            <Bookmark size={13} />
            <span>{lang === 'ar' ? 'المحفوظات' : 'Saved'}</span>
          </button>}
          <button
            onClick={() => setSortBy('announcements')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === 'announcements'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Bell size={13} />
            <span>{isCop ? 'Ⲛⲓⲧⲁⲙⲟ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ' : lang === 'ar' ? 'إعلانات الكنيسة' : 'Announcements'}</span>
          </button>
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto overscroll-contain rounded-3xl p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl relative space-y-4 my-4"
            >
              {/* Hidden file inputs */}
              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleMediaFileChange}
                accept="image/*" 
                multiple
                className="hidden" 
              />
              <input 
                type="file" 
                ref={videoInputRef} 
                onChange={handleMediaFileChange}
                accept="video/mp4,video/webm,video/quicktime,video/*" 
                multiple
                className="hidden" 
              />
              <input 
                type="file" 
                ref={audioInputRef} 
                onChange={handleMediaFileChange}
                accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/*" 
                multiple
                className="hidden" 
              />

              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-[var(--mousa-teal-deep)] flex items-center justify-center font-bold">
                    ✍️
                  </div>
                  <h2 className="text-lg font-bold text-[var(--mousa-teal-deep)] dark:text-white">
                    {isCop ? 'Ⲟⲩϩⲓⲟⲩⲓ̀ ⲙ̀ⲃⲉⲣⲓ ϧⲉⲛ ϯⲕⲟⲓⲛⲱⲛⲓⲁ' : lang === 'ar' ? 'منشور جديد في المجتمع' : 'New Community Post'}
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    void handleCloseComposer();
                  }} 
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <textarea 
                value={newPostText}
                onChange={e => setNewPostText(e.target.value)}
                placeholder={isCop ? 'Ⲟⲩ ⲡⲉⲧⲉⲣϧⲟⲧⲡ ⲛ̀ϩⲏⲧⲕ; Ϣⲱⲡ ⲛ̀ⲟⲩⲣⲏϯ, ⲟⲩⲉⲩⲭⲏ, ⲟⲩⲙⲉⲩⲓ...' : lang === 'ar' ? 'بم تفكر؟ شارك آية، صلاة، تأمل، أو سؤالاً لمدارس الأحد...' : 'What is on your heart? Share a verse, reflection, or prayer...'}
                className="w-full h-28 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 resize-none outline-none focus:border-[var(--mousa-teal-deep)] transition-colors text-sm text-gray-800 dark:text-white"
              />

              <section className="rounded-2xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-sand-50)] dark:bg-stone-800/70 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-[var(--mousa-teal-deep)] dark:text-white">{lang === 'ar' ? 'من يستطيع رؤية المنشور؟' : 'Who can see this post?'}</p><p className="mt-1 text-[11px] text-[var(--mousa-sand-600)] dark:text-stone-300">{lang === 'ar' ? 'الافتراضي: كل أعضاء الكنيسة. يمكنك اختيار فصول محددة.' : 'Default: everyone in the church. You can optionally target specific classes.'}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">{targetClassesEnabled || targetGradesEnabled ? (lang === 'ar' ? 'جمهور محدد' : 'Targeted audience') : (lang === 'ar' ? 'كل الأعضاء' : 'Everyone')}</span></div>
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--mousa-teal-deep)] dark:text-stone-100"><input type="checkbox" checked={targetClassesEnabled} onChange={event => {setTargetClassesEnabled(event.target.checked);if(!event.target.checked)setSelectedTargetClassIds([]);}} className="h-4 w-4 accent-[var(--mousa-teal-deep)]"/>{lang === 'ar' ? 'تحديد فصول بعينها فقط' : 'Limit this post to selected classes'}</label>
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--mousa-teal-deep)] dark:text-stone-100"><input type="checkbox" checked={targetGradesEnabled} onChange={event=>{setTargetGradesEnabled(event.target.checked);if(!event.target.checked)setSelectedTargetGradeGroups([]);}} className="h-4 w-4 accent-[var(--mousa-teal-deep)]"/>{lang === 'ar' ? 'تحديد مرحلة عمرية / صفية' : 'Limit this post to age / grade groups'}</label>
                {targetGradesEnabled && <div className="space-y-2 rounded-xl border border-[var(--mousa-border-sand)] bg-white/70 p-3 dark:bg-stone-900"><p className="text-[11px] font-bold text-[var(--mousa-sand-600)]">{lang === 'ar' ? 'المراحل المتاحة حسب صلاحياتك:' : 'Groups available to your role and class assignments:'}</p>{availableTargetGradeGroups.length ? <div className="grid gap-2 sm:grid-cols-2">{availableTargetGradeGroups.map(groupId=><label key={groupId} className="flex items-center gap-2 rounded-lg bg-[var(--mousa-sand-50)] p-2 text-xs font-semibold dark:bg-stone-800"><input type="checkbox" checked={selectedTargetGradeGroups.includes(groupId)} onChange={event=>setSelectedTargetGradeGroups(current=>event.target.checked?[...current,groupId]:current.filter(id=>id!==groupId))} className="h-4 w-4 accent-[var(--mousa-teal-deep)]"/><span>{lang === 'ar' ? CLASS_GROUPS[groupId as keyof typeof CLASS_GROUPS].name.ar : CLASS_GROUPS[groupId as keyof typeof CLASS_GROUPS].name.en}</span></label>)}</div> : <p className="text-xs text-amber-700">{lang === 'ar' ? 'لا توجد مراحل متاحة حسب تسجيلك الحالي.' : 'No grade groups are available from your current enrollment.'}</p>}{selectedTargetGradeGroups.length>0 && <p className="text-[10px] font-bold text-emerald-700">{lang === 'ar' ? 'سيظهر المنشور للأعضاء في المراحل المحددة.' : 'Only members in the selected grade groups will see this post.'}</p>}</div>}
                {targetClassesEnabled && <div className="space-y-2 rounded-xl border border-[var(--mousa-border-sand)] bg-white/70 p-3 dark:bg-stone-900"><p className="text-[11px] font-bold text-[var(--mousa-sand-600)]">{lang === 'ar' ? 'اختار الفصول المسموح لك باستهدافها:' : 'Choose from classes you are authorized to target:'}</p>{loadingTargetClasses ? <p className="text-xs text-[var(--mousa-sand-500)]">{lang === 'ar' ? 'جارٍ تحميل الفصول…' : 'Loading your classes…'}</p> : availableTargetClasses.length ? <div className="grid gap-2 sm:grid-cols-2">{availableTargetClasses.map(item=><label key={item.id} className="flex items-center gap-2 rounded-lg bg-[var(--mousa-sand-50)] p-2 text-xs font-semibold dark:bg-stone-800"><input type="checkbox" checked={selectedTargetClassIds.includes(item.id)} onChange={event=>setSelectedTargetClassIds(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} className="h-4 w-4 accent-[var(--mousa-teal-deep)]"/><span>{lang === 'ar' ? item.nameAr : item.nameEn}</span></label>)}</div> : <p className="text-xs text-amber-700">{lang === 'ar' ? 'لا توجد فصول يمكنك استهدافها في السنة الكنسية الحالية.' : 'No classes are available for targeting in the active church year.'}</p>}{selectedTargetClassIds.length>0 && <p className="text-[10px] font-bold text-emerald-700">{lang === 'ar' ? 'سيظهر المنشور فقط للأعضاء المسموح لهم في الفصول المحددة.' : 'Only members authorized for the selected classes will see this post.'}</p>}</div>}
              </section>

              <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/60 dark:bg-violet-950/20 space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-violet-900 dark:text-violet-200"><input type="checkbox" checked={pollEnabled} onChange={event=>setPollEnabled(event.target.checked)} className="h-4 w-4 accent-violet-700"/>{lang === 'ar' ? 'إضافة استطلاع للمجتمع' : 'Add a community poll'}</label>
                {pollEnabled && <div className="space-y-2"><input value={pollQuestion} onChange={event=>setPollQuestion(event.target.value)} maxLength={240} placeholder={lang === 'ar'?'اكتب سؤال الاستطلاع…':'Ask your poll question…'} className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 dark:bg-slate-900"/>{pollOptions.map((option,index)=><div key={index} className="flex gap-2"><input value={option} onChange={event=>setPollOptions(current=>current.map((item,i)=>i===index?event.target.value:item))} maxLength={120} placeholder={lang === 'ar'?'الخيار '+(index+1):'Option '+(index+1)} className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500 dark:bg-slate-900"/>{pollOptions.length>2&&<button type="button" onClick={()=>setPollOptions(current=>current.filter((_,i)=>i!==index))} className="rounded-lg px-2 text-rose-600 hover:bg-rose-50" aria-label={lang === 'ar'?'حذف الخيار':'Remove option'}><X size={15}/></button>}</div>)}{pollOptions.length<6&&<button type="button" onClick={()=>setPollOptions(current=>[...current,''])} className="text-xs font-black text-violet-800 hover:underline dark:text-violet-200">+ {lang === 'ar'?'إضافة خيار':'Add option'}</button>}<label className="flex items-center gap-2 text-xs font-semibold text-violet-900 dark:text-violet-200"><input type="checkbox" checked={pollAllowMultiple} onChange={event=>setPollAllowMultiple(event.target.checked)} className="h-4 w-4 accent-violet-700"/>{lang === 'ar'?'السماح باختيار أكثر من إجابة':'Allow multiple answers'}</label></div>}
              </section>

              {/* Media Selection Actions */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'إرفاق وسائط مباشرة إلى السحابة الكنسية' : 'Direct Cloud Upload (High-Durability)'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon size={15} />
                    <span>{lang === 'ar' ? 'رفع صور عالية الدقة' : 'High-Res Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[var(--mousa-teal-deep)] border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Video size={15} />
                    <span>{lang === 'ar' ? 'رفع فيديو مباشر' : 'Upload Video'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Music size={15} />
                    <span>{lang === 'ar' ? 'تسجيل لحن كنسي (صوت MP3)' : 'Hymn Audio (MP3)'}</span>
                  </button>

                  {isRecordingVoice && (
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2" role="status" aria-live="polite">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isVoiceRecordingPaused ? 'bg-amber-500' : 'animate-pulse bg-rose-600'}`} />
                      <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden" aria-label={isVoiceRecordingPaused ? 'Recording paused' : 'Live microphone waveform'}>
                        {waveformLevels.map((level, index) => (
                          <span key={index} className="w-[3px] shrink-0 rounded-full bg-rose-500 transition-[height] duration-100"
                            style={{ height: `${Math.max(4, level * 34)}px`, opacity: isVoiceRecordingPaused ? 0.45 : 0.9 }} />
                        ))}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-rose-800">{isVoiceRecordingPaused ? (lang === 'ar' ? 'متوقف مؤقتًا' : 'Paused') : (lang === 'ar' ? 'يسجل' : 'Recording')}</span>
                    </div>
                  )}
                  {isRecordingVoice && (
                    <button type="button" onClick={pauseOrResumeVoiceRecording}
                      aria-label={isVoiceRecordingPaused ? (lang === 'ar' ? 'استئناف التسجيل' : 'Resume recording') : (lang === 'ar' ? 'إيقاف التسجيل مؤقتًا' : 'Pause recording')}
                      title={isVoiceRecordingPaused ? (lang === 'ar' ? 'استئناف التسجيل' : 'Resume recording') : (lang === 'ar' ? 'إيقاف التسجيل مؤقتًا' : 'Pause recording')}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300 bg-violet-100 text-violet-900 transition-colors hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      {isVoiceRecordingPaused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
                    </button>
                  )}
                  <button type="button" onClick={isRecordingVoice ? stopVoiceRecording : () => void startVoiceRecording()}
                    disabled={!userData || isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS}
                    aria-label={isRecordingVoice ? (lang === 'ar' ? 'إنهاء التسجيل' : 'Finish recording') : (lang === 'ar' ? 'بدء تسجيل صوتي' : 'Start voice recording')}
                    title={isRecordingVoice ? (lang === 'ar' ? 'إنهاء التسجيل' : 'Finish recording') : (lang === 'ar' ? 'بدء تسجيل صوتي' : 'Start voice recording')}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 ${isRecordingVoice ? 'border-rose-700 bg-rose-600 text-white hover:bg-rose-700' : 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100'}`}>
                    {isRecordingVoice ? <Square size={16} fill="currentColor" /> : <Mic size={17} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    disabled={isUploadingMedia || composerAttachments.length >= MAX_FEED_ATTACHMENTS}
                    className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      showLinkInput
                        ? 'bg-[var(--mousa-teal-deep)] text-white border-[var(--mousa-teal-deep)]'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Link2 size={15} />
                    <span>{lang === 'ar' ? 'تضمين رابط وسائط' : 'Embed Media Link'}</span>
                  </button>
                </div>
              </div>

              {/* Link Input Bar */}
              {showLinkInput && (
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    {lang === 'ar' ? 'الصق رابط يوتيوب أو جوجل درايف أو فيديو أو صوت مباشر:' : 'Paste YouTube, Google Drive, direct video or audio URL:'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      value={linkInputValue}
                      onChange={e => setLinkInputValue(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLink}
                      className="px-4 py-2 bg-[var(--mousa-teal-deep)] text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'تضمين' : 'Attach'}
                    </button>
                  </div>
                </div>
              )}

              {/* Uploading progress indicator */}
              {isUploadingMedia && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                  <Loader2 className="animate-spin text-[var(--mousa-teal-deep)]" size={20} />
                  <p className="text-xs font-bold text-blue-900">{uploadStatusText}</p>
                </div>
              )}

              {/* Error indicator */}
              {mediaError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <p className="leading-relaxed">{mediaError}</p>
                </div>
              )}

              {composerAttachments.length > 0 && (
                <section className="space-y-2" aria-label={lang === 'ar' ? 'المرفقات' : 'Attachments'}>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>{lang === 'ar' ? 'المرفقات' : 'Attachments'}</span>
                    <span>{composerAttachments.length} / {MAX_FEED_ATTACHMENTS}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {composerAttachments.map(attachment => (
                      <div key={attachment.id} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-2 p-2">
                          <span className="truncate text-xs font-bold text-gray-700 dark:text-gray-200">
                            {attachment.originalFilename || (attachment.mediaType === 'youtube' ? 'YouTube' : attachment.mediaType)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void removeComposerAttachment(attachment.id)}
                            disabled={isUploadingMedia || isCreatingPost}
                            aria-label={lang === 'ar' ? 'إزالة المرفق' : 'Remove attachment'}
                            className="shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {attachment.mediaType === 'audio' ? (
                          <>
                            <div className="min-w-0 px-3 pt-2"><UniversalAudioPlayer src={attachment.mediaUrl} lang={lang === 'ar' ? 'ar' : 'en'} compact /></div>
                            {attachment.isVoiceRecording && (
                              <div className="mx-3 mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                                <label className="flex items-start gap-2 text-xs font-bold text-violet-900">
                                  <input type="checkbox" checked={Boolean(attachment.includeInGlobalPlayer)}
                                    onChange={event => setComposerAttachments(previous => previous.map(item => item.id === attachment.id ? { ...item, includeInGlobalPlayer: event.target.checked } : item))}
                                    className="mt-0.5 accent-violet-700" />
                                  <span>{lang === 'ar' ? 'أضف التسجيل للمشغل الصوتي العام' : 'Also add this recording to the global audio player'}</span>
                                </label>
                                {attachment.includeInGlobalPlayer && (
                                  <input type="text" value={attachment.globalAudioTitle || ''}
                                    onChange={event => setComposerAttachments(previous => previous.map(item => item.id === attachment.id ? { ...item, globalAudioTitle: event.target.value } : item))}
                                    placeholder={lang === 'ar' ? 'اسم التسجيل الذي سيظهر في المشغل' : 'Title shown in the global player'}
                                    className="w-full min-w-0 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-stone-800" maxLength={100} />
                                )}
                              </div>
                            )}
                          </>
                        ) : attachment.mediaType === 'youtube' || attachment.mediaType === 'embed' ? (
                          <FeedEmbeddedMediaPlayer src={attachment.mediaUrl} title="Media preview" />
                        ) : attachment.mediaType === 'video' ? (
                          <FeedVideoPlayer src={attachment.mediaUrl} poster={attachment.mediaThumbnail} title={attachment.originalFilename || 'Video preview'} lang={lang === 'ar' ? 'ar' : 'en'} />
                        ) : (
                          <img src={attachment.mediaUrl} alt={attachment.originalFilename || 'Attachment preview'} className="aspect-video w-full object-cover" />
                        )}
                        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                          <span className={attachment.status === 'ready' ? 'font-bold text-emerald-700' : attachment.status === 'error' ? 'font-bold text-red-700' : 'font-bold text-blue-700'}>
                            {attachment.status === 'ready'
                              ? (lang === 'ar' ? 'جاهز للنشر' : 'Ready to publish')
                              : attachment.status === 'error'
                              ? (attachment.error ? getLocalizedErrorMessage(attachment.error, lang) : (lang === 'ar' ? 'فشل الرفع' : 'Upload failed'))
                              : (lang === 'ar' ? 'جارٍ الرفع...' : 'Uploading...')}
                          </span>
                          {attachment.status === 'error' && (
                            <button
                              type="button"
                              onClick={() => void retryComposerAttachment(attachment.id)}
                              disabled={isUploadingMedia}
                              className="rounded-lg bg-white px-2 py-1 font-bold text-[var(--mousa-teal-deep)] disabled:opacity-50"
                            >
                              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Teacher option: Pin Announcement */}
              {isTeacher && (
                <label className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={isOfficialAnnouncement}
                    onChange={(e) => setIsOfficialAnnouncement(e.target.checked)}
                    className="accent-[var(--mousa-gold)] w-4 h-4 rounded cursor-pointer"
                  />
                  <span>{isCop ? '📌 Ⲟⲩⲧⲁⲙⲟ ⲛ̀ⲇⲓⲁⲕⲟⲛ ⲉⲧⲧⲁϫⲣⲏⲟⲩⲧ' : lang === 'ar' ? '📌 إعلان خادم رسمي وتثبيت في الأعلى' : '📌 Official Servant Announcement (Pin to top)'}</span>
                </label>
              )}

              <button 
                onClick={handleCreatePost} 
                disabled={(!newPostText.trim() && composerAttachments.length === 0 && !pollEnabled) || (pollEnabled && (pollQuestion.trim().length < 2 || pollOptions.filter(option => option.trim()).length < 2)) || ((targetClassesEnabled || targetGradesEnabled) && selectedTargetClassIds.length === 0 && selectedTargetGradeGroups.length === 0) || isUploadingMedia || isRecordingVoice || isCreatingPost || composerAttachments.some(attachment => attachment.status !== 'ready' || (attachment.isVoiceRecording && attachment.includeInGlobalPlayer && !attachment.globalAudioTitle?.trim()))}
                className={`w-full font-bold py-3.5 rounded-xl transition-colors shadow-md text-sm cursor-pointer flex items-center justify-center gap-2 ${
                  (newPostText.trim() || composerAttachments.length > 0 || pollEnabled) && !isUploadingMedia && !isCreatingPost && composerAttachments.every(attachment => attachment.status === 'ready')
                    ? 'bg-[var(--mousa-teal-deep)] text-[var(--mousa-gold)] hover:bg-blue-900'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCreatingPost ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                <span>{isCop ? 'Ⲁⲣⲉϩ ⲟⲩⲟϩ ϩⲓⲟⲩⲓ̀ ϧⲉⲛ ϯⲕⲟⲓⲛⲱⲛⲓⲁ' : lang === 'ar' ? 'حفظ ونشر في المجتمع الآن' : 'Save & Publish Post'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Posts List */}
      {getFeedDisplayState(isFeedLoading, feedLoadError, sortedPosts) === 'loading' ? (
        <div className="space-y-6 md:columns-2 lg:columns-3 md:gap-6 md:space-y-0" aria-label={lang === 'ar' ? 'جارٍ تحميل المنشورات' : 'Loading posts'} aria-busy="true">
          {[0, 1, 2].map(item => (
            <div key={item} className="mb-6 break-inside-avoid animate-pulse rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 dark:bg-[#1E1914]">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--mousa-sand-200)] dark:bg-stone-700" />
                <div className="space-y-2">
                  <div className="h-3 w-28 rounded bg-[var(--mousa-sand-200)] dark:bg-stone-700" />
                  <div className="h-2 w-20 rounded bg-[var(--mousa-sand-100)] dark:bg-stone-800" />
                </div>
              </div>
              <div className="mb-2 h-3 w-full rounded bg-[var(--mousa-sand-100)] dark:bg-stone-800" />
              <div className="mb-5 h-3 w-4/5 rounded bg-[var(--mousa-sand-100)] dark:bg-stone-800" />
              <div className="h-36 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-stone-800" />
            </div>
          ))}
        </div>
      ) : getFeedDisplayState(false, feedLoadError, sortedPosts) === 'error' ? (
        <div role="alert" className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/30">
          <AlertCircle className="mx-auto mb-3 text-rose-600 dark:text-rose-300" size={32} />
          <p className="font-bold text-rose-900 dark:text-rose-100">
            {lang === 'ar' ? 'مش قادرين نحمّل منشورات المجتمع دلوقتي.' : 'We couldn’t load community posts right now.'}
          </p>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">{feedLoadError}</p>
          <button onClick={retryFeedLoad} className="mt-4 rounded-xl bg-rose-700 px-5 py-2.5 font-bold text-white hover:bg-rose-800">
            {lang === 'ar' ? 'حاول تاني' : 'Try again'}
          </button>
        </div>
      ) : getFeedDisplayState(false, null, sortedPosts) === 'empty' ? (
        <div className="rounded-3xl border-2 border-dashed border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] px-6 py-12 text-center dark:bg-[#1E1914]">
          <MessageCircle className="mx-auto mb-3 text-[var(--mousa-teal)]" size={34} />
          <p className="font-black text-[var(--mousa-teal-deep)] dark:text-stone-100">
            {lang === 'ar' ? 'لسه مفيش منشورات هنا.' : 'There are no posts yet.'}
          </p>
          <p className="mt-1 text-sm text-[var(--mousa-sand-600)] dark:text-stone-400">
            {lang === 'ar' ? 'شارك آية أو كلمة تشجيع مع أسرة الكنيسة.' : 'Share a verse or encouraging thought with your church family.'}
          </p>
        </div>
      ) : (
      <div className="space-y-6 md:columns-2 lg:columns-3 md:gap-6 md:space-y-0">
        <AnimatePresence mode="popLayout">
          {sortedPosts.map((post, idx) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              key={post.id}
              id={`feed-post-${post.id}`}
              className={`bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-5 shadow-xs border-2 break-inside-avoid mb-6 relative transition-all hover:shadow-sm ${
                post.isPinned 
                  ? 'border-[var(--mousa-gold)] bg-amber-50/20' 
                  : 'border-[var(--mousa-border-sand)]'
              }`}
            >
              {/* Pinned Announcement Flag */}
              {post.isPinned && (
                <div className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[var(--mousa-gold)] bg-amber-50 px-3 py-1 rounded-full w-fit">
                  <Pin size={13} className="rotate-45" />
                  <span>{lang === 'ar' ? 'إعلان كنسي مثبت' : 'Pinned Church Announcement'}</span>
                </div>
              )}

              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={post.authorAvatar} 
                    alt={post.authorName} 
                    className="w-10 h-10 rounded-full bg-gray-100 border-2 border-[var(--color-church-cream)] object-cover" 
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => { const url = new URL(window.location.href); url.searchParams.set('tab', 'feed'); url.searchParams.set('profile', post.authorId); window.location.assign(url.toString()); }} className="text-start font-bold text-sm text-[var(--mousa-teal-deep)] dark:text-[#F8E9C8] hover:text-[var(--mousa-gold)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mousa-gold)]">{post.authorName}</button>
                      {post.isAnnouncement && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          {lang === 'ar' ? 'خادم' : 'Servant'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {new Date(post.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                </div>

                {/* Teacher Moderator Controls (Pin & Delete) */}
                {isTeacher && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(post.id)}
                      className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        post.isPinned ? 'text-[var(--mousa-gold)] bg-amber-50' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={post.isPinned ? (lang === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (lang === 'ar' ? 'تثبيت في الأعلى' : 'Pin to top')}
                    >
                      <Pin size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'حذف المنشور (إشراف الخادم)' : 'Delete post (Moderator)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Post Body */}
              <p className="text-gray-800 mb-4 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
              {post.poll && <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/60 dark:bg-violet-950/20"><h4 className="mb-3 text-sm font-black text-violet-950 dark:text-violet-100">{post.poll.question}</h4><div className="space-y-2">{post.poll.options.map(option=>{const total=post.poll!.options.reduce((sum,item)=>sum+item.voteCount,0);const alreadyVoted=post.poll!.options.some(item=>item.hasVoted);const percent=total?Math.round(option.voteCount/total*100):0;return <button key={option.id} type="button" disabled={Boolean(option.hasVoted)||(!post.poll!.allowMultiple&&alreadyVoted)||Boolean(votingOptionId)} onClick={async()=>{setVotingOptionId(option.id);const result=await voteFeedPollInSupabase(option.id);if(result.error)setActionError(result.error.message);else{const refreshed=await fetchFeedPostsFromSupabase();if(refreshed.data)setPosts(refreshed.data);}setVotingOptionId(null);}} className="relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-start text-xs font-bold text-violet-950 disabled:cursor-default dark:border-violet-900 dark:bg-slate-900 dark:text-violet-100"><span className="absolute inset-y-0 start-0 bg-violet-200/70 transition-all dark:bg-violet-900/50" style={{width:percent+'%'}}/><span className="relative z-10">{option.label}{option.hasVoted?' ✓':''}</span><span className="relative z-10 tabular-nums">{total?percent+'% · ':''}{option.voteCount}</span></button>})}</div><p className="mt-2 text-[10px] text-violet-800/70 dark:text-violet-200/70">{post.poll.allowMultiple?(lang==='ar'?'يمكن اختيار أكثر من إجابة':'Multiple answers allowed'):(lang==='ar'?'اختيار إجابة واحدة':'Choose one answer')}</p></section>}

              {getPostAttachments(post).length > 0 && (
                <div className={`mb-4 grid gap-3 ${getPostAttachments(post).length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                  {getPostAttachments(post).map((attachment, index) => (
                    <div key={attachment.id} className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200/70 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                      {missingMediaIds.has(attachment.id) ? (
                        <div className="flex aspect-video items-center justify-center gap-2 bg-gray-100 px-4 text-center text-xs font-bold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                          <AlertCircle size={16} />
                          {lang === 'ar' ? 'هذا الملف غير متاح حالياً.' : 'This attachment is currently unavailable.'}
                        </div>
                      ) : attachment.mediaType === 'youtube' || attachment.mediaType === 'embed' ? (
                        <FeedEmbeddedMediaPlayer
                          src={attachment.mediaUrl}
                          title={attachment.mediaType === 'youtube' ? 'Church video' : 'Church media'}
                          onError={() => setMissingMediaIds(previous => new Set(previous).add(attachment.id))}
                        />
                      ) : attachment.mediaType === 'audio' ? (
                        <FeedVoiceMessage src={attachment.mediaUrl} lang={lang === 'ar' ? 'ar' : 'en'} />
                      ) : attachment.mediaType === 'video' ? (
                        <FeedVideoPlayer
                          src={attachment.mediaUrl}
                          poster={attachment.mediaThumbnail}
                          title={attachment.originalFilename || (lang === 'ar' ? 'فيديو المجتمع' : 'Community video')}
                          onError={() => setMissingMediaIds(previous => new Set(previous).add(attachment.id))}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPostMedia(post, attachment)}
                          aria-label={lang === 'ar' ? 'عرض الصورة بالحجم الكامل' : 'View photo full size'}
                          className="group relative block w-full cursor-zoom-in bg-gray-900/5 dark:bg-black/30"
                        >
                          <img
                            src={attachment.mediaUrl}
                            alt={attachment.originalFilename || `Post attachment ${index + 1}`}
                            loading="lazy"
                            onError={() => setMissingMediaIds(previous => new Set(previous).add(attachment.id))}
                            className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] sm:h-52"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition-colors group-hover:bg-black/30">
                            <span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold opacity-0 group-hover:opacity-100">
                              <Maximize2 size={13} className="me-1 inline" />
                              {lang === 'ar' ? 'عرض بالحجم الكامل' : 'View full size'}
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Post Reactions Bar */}
              <div data-feed-reaction-root className="relative flex items-center gap-2 border-t border-gray-100 pt-3 pb-1 flex-wrap">
                {FEED_REACTIONS.filter(reaction => ['heart', 'candle', 'cross'].includes(reaction.key) || (post.reactions[reaction.key] || 0) > 0).map(reaction => (
                  <motion.button
                    key={reaction.key}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => void handleReactPost(post.id, reaction.key)}
                    aria-pressed={myPostReactionKeys.has(post.id + ':' + reaction.key)}
                    aria-label={lang === 'ar' ? reaction.labelAr : reaction.labelEn}
                    title={lang === 'ar' ? reaction.labelAr : reaction.labelEn}
                    className={'inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-all ' + (myPostReactionKeys.has(post.id + ':' + reaction.key) ? 'border-amber-500 bg-amber-100 text-amber-950 shadow-[inset_0_1px_3px_rgba(120,75,10,.18)] ring-2 ring-amber-300/70 dark:border-amber-300 dark:bg-amber-400/20 dark:text-amber-100' : 'border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:border-[var(--mousa-gold)] hover:bg-[var(--state-hover)]')}
                  >
                    <span className="text-sm leading-none">{reaction.emoji}</span>
                    <span className="tabular-nums">{post.reactions[reaction.key] || 0}</span>
                  </motion.button>
                ))}
                <button type="button" onClick={() => setReactionPickerTarget(reactionPickerTarget === 'post:' + post.id ? null : 'post:' + post.id)} aria-label={lang === 'ar' ? 'إضافة تفاعل' : 'Add reaction'} title={lang === 'ar' ? 'إضافة تفاعل' : 'Add reaction'} className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-[var(--border-default)] text-base font-black text-[var(--text-secondary)] hover:border-[var(--mousa-gold)] hover:text-[var(--mousa-gold)]">＋</button>
                {reactionPickerTarget === 'post:' + post.id && <div data-feed-reaction-picker className="absolute bottom-full start-0 z-30 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 shadow-xl">{FEED_REACTIONS.map(reaction => <button key={reaction.key} type="button" onClick={() => { void handleReactPost(post.id, reaction.key); setReactionPickerTarget(null); }} title={lang === 'ar' ? reaction.labelAr : reaction.labelEn} aria-label={lang === 'ar' ? reaction.labelAr : reaction.labelEn} className="grid h-9 w-9 place-items-center rounded-xl text-lg transition hover:scale-110 hover:bg-[var(--state-hover)]">{reaction.emoji}</button>)}</div>}
                
                <div className="flex-1"></div>
                
                <button
                  type="button"
                  onClick={() => void handleSharePost(post)}
                  aria-label={lang === 'ar' ? 'مشاركة المنشور' : 'Share post'}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-gray-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
                >
                  <Share2 size={14}/>
                  {lang === 'ar' ? 'مشاركة' : 'Share'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleBookmark(post.id)}
                  disabled={!userData?.id}
                  aria-pressed={bookmarkedPostIds.has(post.id)}
                  aria-label={bookmarkedPostIds.has(post.id) ? (lang === 'ar' ? 'إزالة من المحفوظات' : 'Remove from saved') : (lang === 'ar' ? 'حفظ المنشور' : 'Save post')}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${bookmarkedPostIds.has(post.id) ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
                >
                  {bookmarkedPostIds.has(post.id) ? <BookmarkCheck size={14}/> : <Bookmark size={14}/>}
                  {lang === 'ar' ? (bookmarkedPostIds.has(post.id) ? 'محفوظ' : 'حفظ') : (bookmarkedPostIds.has(post.id) ? 'Saved' : 'Save')}
                </button>
                <button 
                  onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-[var(--mousa-teal-deep)] font-bold text-xs transition-colors cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>
                    {post.comments.reduce((total, c) => total + 1 + (c.replies?.length || 0), 0)} {lang === 'ar' ? 'تعليقات وردود' : 'Comments'}
                  </span>
                </button>
                {workspace === 'student' && post.authorId !== userData?.id && (
                  <button type="button" onClick={() => { setReportingPostId(post.id); setReportReason('inappropriate'); setReportDetails(''); }} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-700" aria-label={lang === 'ar' ? 'الإبلاغ عن المنشور' : 'Report post'}>
                    <Flag size={13} /> {lang === 'ar' ? 'إبلاغ' : 'Report'}
                  </button>
                )}
              </div>

              {/* Comments and Nested Replies Section */}
              <AnimatePresence>
                {expandedPostId === post.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-3 space-y-3 border-t border-gray-100 mt-2"
                  >
                    {post.comments.length > 0 ? (
                      post.comments.map(comment => (
                        <div key={comment.id} className="space-y-2">
                          {/* Main Comment */}
                          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-xs text-[var(--mousa-teal-deep)]">{comment.authorName}</p>
                              <button 
                                onClick={() => {
                                  setReplyTarget({ commentId: comment.id, replyToAuthor: comment.authorName });
                                }} 
                                className="text-[11px] font-bold text-gray-500 hover:text-[var(--mousa-teal-deep)] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <CornerDownRight size={12} />
                                <span>{lang === 'ar' ? 'رد' : 'Reply'}</span>
                              </button>
                            </div>
                            
                            <p className="text-xs text-gray-700 leading-relaxed">{comment.content}</p>
                            
                            {/* Reactions for this Comment */}
                            <div className="relative flex flex-wrap items-center gap-1.5 pt-1">
                              {FEED_REACTIONS.filter(reaction => ['heart', 'candle', 'cross'].includes(reaction.key) || (comment.reactions?.[reaction.key] || 0) > 0).map(reaction => (
                                <button key={reaction.key} type="button" onClick={() => handleReactComment(post.id, comment.id, reaction.key)} aria-label={lang === 'ar' ? reaction.labelAr : reaction.labelEn} title={lang === 'ar' ? reaction.labelAr : reaction.labelEn} className="inline-flex min-h-7 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-700 transition-colors hover:border-[var(--mousa-gold)] hover:bg-amber-50 dark:border-[var(--border-default)] dark:bg-[var(--surface-secondary)] dark:text-[var(--text-primary)]">
                                  <span>{reaction.emoji}</span><span className="tabular-nums">{comment.reactions?.[reaction.key] || 0}</span>
                                </button>
                              ))}
                              <button type="button" onClick={() => setReactionPickerTarget(reactionPickerTarget === 'comment:' + comment.id ? null : 'comment:' + comment.id)} aria-label={lang === 'ar' ? 'إضافة تفاعل' : 'Add reaction'} className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-gray-300 text-sm font-black text-gray-500 hover:border-[var(--mousa-gold)] hover:text-[var(--mousa-gold)]">＋</button>
                              {reactionPickerTarget === 'comment:' + comment.id && <div className="absolute bottom-full start-0 z-30 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 shadow-xl">{FEED_REACTIONS.map(reaction => <button key={reaction.key} type="button" onClick={() => { void handleReactComment(post.id, comment.id, reaction.key); setReactionPickerTarget(null); }} title={lang === 'ar' ? reaction.labelAr : reaction.labelEn} aria-label={lang === 'ar' ? reaction.labelAr : reaction.labelEn} className="grid h-8 w-8 place-items-center rounded-xl text-base hover:bg-[var(--state-hover)]">{reaction.emoji}</button>)}</div>}
                            </div>
                          </div>
                          
                          {/* Nested Replies to this comment */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="space-y-1.5 ps-4 border-s-2 border-[var(--mousa-gold)]/40">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="bg-[var(--color-church-cream)]/50 p-2.5 rounded-xl border border-[var(--mousa-gold)]/20 space-y-1">
                                  <div className="flex justify-between items-start">
                                    <p className="font-bold text-[11px] text-[var(--mousa-teal-deep)]">{reply.authorName}</p>
                                    <button 
                                      onClick={() => {
                                        setReplyTarget({ commentId: comment.id, replyToAuthor: reply.authorName });
                                      }} 
                                      className="text-[10px] font-bold text-gray-500 hover:text-[var(--mousa-teal-deep)] flex items-center gap-0.5 transition-colors cursor-pointer"
                                    >
                                      <CornerDownRight size={11} />
                                      <span>{lang === 'ar' ? 'رد' : 'Reply'}</span>
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>

                                  {/* Reactions for this Reply */}
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button 
                                      onClick={() => handleReactReply(post.id, comment.id, reply.id, 'heart')}
                                      className="text-[10px] bg-white/80 border border-gray-200 hover:bg-red-50 hover:text-red-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold text-gray-600 transition-colors cursor-pointer"
                                    >
                                      <span>❤️</span>
                                      <span>{reply.reactions?.heart || 0}</span>
                                    </button>
                                    <button 
                                      onClick={() => handleReactReply(post.id, comment.id, reply.id, 'candle')}
                                      className="text-[10px] bg-white/80 border border-gray-200 hover:bg-amber-50 hover:text-amber-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold text-gray-600 transition-colors cursor-pointer"
                                    >
                                      <span>🕯️</span>
                                      <span>{reply.reactions?.candle || 0}</span>
                                    </button>
                                    <button 
                                      onClick={() => handleReactReply(post.id, comment.id, reply.id, 'cross')}
                                      className="text-[10px] bg-white/80 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold text-gray-600 transition-colors cursor-pointer"
                                    >
                                      <span>✝️</span>
                                      <span>{reply.reactions?.cross || 0}</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        {lang === 'ar' ? 'كن أول من يشارك بتعليق مشجع!' : 'Be the first to share an encouraging comment!'}
                      </p>
                    )}
                    
                    {/* Write comment or reply input */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                      {replyTarget && (
                        <div className="flex items-center justify-between bg-blue-50 text-[var(--color-church-blue)] px-3 py-1.5 rounded-xl text-xs font-bold">
                          <span>
                            {lang === 'ar' 
                              ? `جاري الرد على: ${replyTarget.replyToAuthor || 'التعليق'}` 
                              : `Replying to: ${replyTarget.replyToAuthor || 'comment'}`}
                          </span>
                          <button onClick={() => setReplyTarget(null)} className="p-0.5 hover:text-red-500 cursor-pointer">
                            <X size={14}/>
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          placeholder={
                            replyTarget 
                              ? (lang === 'ar' ? 'اكتب ردك هنا...' : 'Write your reply here...') 
                              : (lang === 'ar' ? 'اكتب تعليقاً مشجعاً...' : 'Write an encouraging comment...')
                          } 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddCommentOrReply(post.id);
                            }
                          }}
                          className="flex-1 bg-gray-100 border-none focus:ring-1 focus:ring-[var(--color-church-gold)] rounded-xl px-3.5 py-2 text-xs outline-none"
                        />
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddCommentOrReply(post.id)}
                          disabled={!replyText.trim()}
                          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                            replyText.trim()
                              ? 'bg-[var(--color-church-blue)] text-white shadow-2xs hover:bg-blue-900'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Send size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {reportingPost && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/65 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={lang === 'ar' ? 'الإبلاغ عن منشور' : 'Report a post'} onClick={() => !reportBusy && setReportingPostId(null)}>
          <motion.form initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} onSubmit={event => { event.preventDefault(); void submitPostReport(); }} onClick={event => event.stopPropagation()} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'إبلاغ عن منشور' : 'Report this post'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{lang === 'ar' ? 'البلاغ سري، وفريق الخدمة المخوّل فقط يقدر يراجعه.' : 'Reports are private and can only be reviewed by authorized church staff.'}</p></div>
              <button type="button" onClick={() => setReportingPostId(null)} disabled={reportBusy} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'سبب البلاغ' : 'Why are you reporting this?' }
              <select value={reportReason} onChange={event => setReportReason(event.target.value as typeof reportReason)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="inappropriate">{lang === 'ar' ? 'محتوى غير مناسب' : 'Inappropriate content'}</option>
                <option value="harassment">{lang === 'ar' ? 'تنمّر أو مضايقة' : 'Bullying or harassment'}</option>
                <option value="privacy">{lang === 'ar' ? 'معلومات شخصية أو خصوصية' : 'Personal information or privacy'}</option>
                <option value="spam">{lang === 'ar' ? 'رسائل مزعجة أو تكرار' : 'Spam or repeated content'}</option>
                <option value="other">{lang === 'ar' ? 'سبب آخر' : 'Something else'}</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}
              <textarea value={reportDetails} onChange={event => setReportDetails(event.target.value.slice(0, 1000))} rows={3} placeholder={lang === 'ar' ? 'شارك أي تفاصيل تساعد فريق الخدمة...' : 'Share any details that may help the team...'} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportingPostId(null)} disabled={reportBusy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" disabled={reportBusy} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{reportBusy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}{lang === 'ar' ? 'إرسال البلاغ' : 'Submit report'}</button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Full-screen media viewer: swipe between a post's media, zoom photos, and save to device. */}
      <AnimatePresence>
        {lightboxAttachment && (
          <div
            onClick={() => setLightboxAttachment(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/90 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'ar' ? 'عارض الوسائط' : 'Media viewer'}
            tabIndex={-1}
            onTouchStart={event => { lightboxTouchStartRef.current = event.changedTouches[0]?.clientX ?? null; }}
            onTouchEnd={event => {
              const start = lightboxTouchStartRef.current;
              const end = event.changedTouches[0]?.clientX;
              lightboxTouchStartRef.current = null;
              if (start === null || end === undefined || Math.abs(end - start) < 55) return;
              navigateLightbox(end < start ? 1 : -1);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative flex max-h-[92dvh] max-w-6xl flex-col items-center gap-3"
              onClick={event => event.stopPropagation()}
            >
              <div className="absolute -top-1 end-0 z-20 flex items-center gap-2">
                <button type="button" onClick={() => void saveLightboxMedia()} aria-label={lang === 'ar' ? 'حفظ الوسائط على الجهاز' : 'Save media to device'} title={lang === 'ar' ? 'حفظ على الجهاز' : 'Save to device'} className="rounded-full bg-black/70 p-2.5 text-white hover:bg-black">
                  <Download size={19} />
                </button>
                <button type="button" onClick={() => setLightboxAttachment(null)} aria-label={lang === 'ar' ? 'إغلاق عارض الوسائط' : 'Close media viewer'} className="rounded-full bg-black/70 p-2.5 text-white hover:bg-black">
                  <X size={20} />
                </button>
              </div>
              {lightboxGallery.length > 1 && (
                <>
                  <button type="button" onClick={() => navigateLightbox(-1)} aria-label={lang === 'ar' ? 'الوسائط السابقة' : 'Previous media'} className="absolute start-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/65 p-3 text-white hover:bg-black">
                    <ChevronLeft size={22} />
                  </button>
                  <button type="button" onClick={() => navigateLightbox(1)} aria-label={lang === 'ar' ? 'الوسائط التالية' : 'Next media'} className="absolute end-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/65 p-3 text-white hover:bg-black">
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
              {lightboxAttachment.mediaType === 'video' ? (
                <div className="w-[min(92vw,64rem)] overflow-hidden rounded-2xl bg-black shadow-2xl">
                  <FeedVideoPlayer src={lightboxAttachment.mediaUrl} poster={lightboxAttachment.mediaThumbnail} title={lightboxAttachment.originalFilename || 'Community video'} />
                </div>
              ) : (
                <img
                  src={lightboxAttachment.mediaUrl}
                  alt={lightboxAttachment.originalFilename || 'Enlarged church photo'}
                  onDoubleClick={() => setLightboxScale(value => value > 1 ? 1 : 2)}
                  style={{ transform: `scale(${lightboxScale})` }}
                  className="max-h-[78dvh] max-w-full rounded-2xl object-contain transition-transform duration-200"
                />
              )}
              {lightboxAttachment.mediaType !== 'video' && (
                <div className="flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-white">
                  <button type="button" onClick={() => setLightboxScale(value => Math.max(1, Number((value - 0.25).toFixed(2))))} disabled={lightboxScale <= 1} aria-label={lang === 'ar' ? 'تصغير الصورة' : 'Zoom out'} className="rounded-full p-1.5 disabled:opacity-35"><ZoomOut size={19} /></button>
                  <span className="min-w-12 text-center text-xs font-bold tabular-nums">{Math.round(lightboxScale * 100)}%</span>
                  <button type="button" onClick={() => setLightboxScale(value => Math.min(4, Number((value + 0.25).toFixed(2))))} disabled={lightboxScale >= 4} aria-label={lang === 'ar' ? 'تكبير الصورة' : 'Zoom in'} className="rounded-full p-1.5 disabled:opacity-35"><ZoomIn size={19} /></button>
                  <button type="button" onClick={() => setLightboxScale(1)} aria-label={lang === 'ar' ? 'إعادة ضبط التكبير' : 'Reset zoom'} className="ms-1 rounded-full border-s border-white/25 ps-3 text-xs font-bold">{lang === 'ar' ? 'إعادة' : 'Reset'}</button>
                </div>
              )}
              {lightboxGallery.length > 1 && <p className="text-xs font-semibold text-white/75">{lightboxIndex + 1} / {lightboxGallery.length} · {lang === 'ar' ? 'اسحب للتنقل' : 'Swipe to browse'}</p>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
