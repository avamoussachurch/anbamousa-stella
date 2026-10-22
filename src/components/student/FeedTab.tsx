import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MessageCircle, Heart, Share2, Send, CornerDownRight, X, Pin, Trash2, 
  ShieldCheck, Sparkles, Filter, ArrowUpDown, Flame, Clock, Bell, User as UserIcon,
  Image as ImageIcon, Video, Link2, Loader2, Play, Info, ExternalLink, AlertCircle, Check, Maximize2,
  Volume2, Database, HardDrive, Music, HelpCircle, CheckCircle2, Server, CloudLightning
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockPosts } from '../../data';
import { Post, Comment, Reply, Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { uploadFeedMediaToSupabase, extractEmbedMedia, checkStorageBackendStatus } from '../../lib/supabaseDatabase';
import {
  fetchFeedPostsFromSupabase,
  createFeedPostInSupabase,
  deleteFeedPostFromSupabase,
  toggleFeedPostPinInSupabase,
  toggleFeedReactionInSupabase,
  addFeedCommentInSupabase,
  syncUserLocalPostsToSupabase,
  ExtendedPost
} from '../../lib/feedService';

type SortOption = 'latest' | 'popular' | 'discussed' | 'announcements';

const FEED_STORAGE_KEY = 'orthodox_church_feed_posts_v5';

export function FeedTab({ lang }: { lang: Language }) {
  const { userData } = useAuth();
  const isCop = lang === 'copt' || lang === 'cop';
  
  // 1. Saved Feed Posts from localStorage with default initial seed
  const [posts, setPosts] = useState<ExtendedPost[]>(() => {
    try {
      const saved = localStorage.getItem(FEED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load feed posts from storage', e);
    }

    return [
      {
        id: 'announcement-1',
        authorId: 'teacher-1',
        authorName: lang === 'ar' ? 'أ. عماد (خادم أسرة مارمينا)' : 'Servant Emad (Sunday School)',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherEmad',
        content: lang === 'ar' 
          ? '🔔 تذكير هام لجميع الأبناء: موعد خدمة مدارس الأحد الجمعة القادمة الساعة ٩:٠٠ صباحاً، يرجى حفظ آية الأسبوع!' 
          : '🔔 Important Announcement: Sunday School gathering is this Friday at 9:00 AM. Please memorize this week\'s verse!',
        reactions: { heart: 14, candle: 22, cross: 18 },
        comments: [
          {
            id: 'c-1',
            authorName: lang === 'ar' ? 'مينا سامي' : 'Mina Samy',
            authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mina',
            content: lang === 'ar' ? 'حاضر يا أستاذنا، حفظت الآية ومستعد للمسابقة! 🙏' : 'Yes sir, memorized the verse and ready for the quiz! 🙏',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            reactions: { heart: 5, candle: 3, cross: 4 },
            replies: [
              {
                id: 'r-1',
                authorName: lang === 'ar' ? 'أ. عماد (خادم)' : 'Servant Emad',
                content: lang === 'ar' ? 'باركك الرب يا مينا، شاطر جداً يا حبيبي 🌟' : 'God bless you Mina, wonderful effort 🌟',
                createdAt: new Date(Date.now() - 1800000).toISOString(),
                reactions: { heart: 3, candle: 2, cross: 2 }
              }
            ]
          }
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        isPinned: true,
        isAnnouncement: true
      },
      {
        id: 'photo-post-1',
        authorId: 'teacher-2',
        authorName: lang === 'ar' ? 'تاسوني مريم (خدمة ابتدائي)' : 'Tasoni Mary (Sunday School)',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TasoniMary',
        content: lang === 'ar' 
          ? '📸 صور من لقاء مدارس الأحد وتوزيع بركة أعياد النيروز على أبنائنا الأحباء. بارك الله في خدمتكم جميعاً! ✝️❤️' 
          : '📸 Photos from our Sunday School gathering celebrating Coptic Nayrouz. God bless our children! ✝️❤️',
        reactions: { heart: 19, candle: 15, cross: 12 },
        comments: [],
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1548625361-19597793b80b?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'video-post-1',
        authorId: 'deacon-1',
        authorName: lang === 'ar' ? 'الشماس بيشوي عادل' : 'Deacon Bishoy Adel',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DeaconBishoy',
        content: lang === 'ar' 
          ? '🎥 تدريب لحن "تين أوسشت" مع الناقوس والدف. تدربوا عليه جيداً مع إخوتكم الشمامسة لقداس الجمعة القادم! 🔔' 
          : '🎥 Hymn rehearsal video for "Ten Oousht" with cymbals. Practice well for Friday Liturgy! 🔔',
        reactions: { heart: 25, candle: 31, cross: 20 },
        comments: [],
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        mediaType: 'youtube',
        mediaUrl: 'https://www.youtube-nocookie.com/embed/9Bv_A_2h1OQ'
      },
      ...mockPosts.map(p => ({
        ...p,
        comments: p.comments.map(c => ({
          ...c,
          reactions: c.reactions || { heart: 2, candle: 1, cross: 3 },
          replies: (c.replies || []).map(r => ({
            ...r,
            reactions: r.reactions || { heart: 1, candle: 0, cross: 1 }
          }))
        }))
      }))
    ];
  });

  // Save to localStorage whenever posts change (as an offline cache)
  useEffect(() => {
    try {
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      console.error('Failed to cache feed posts locally', e);
    }
  }, [posts]);

  // Server state & notifications
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadingServerPosts, setIsLoadingServerPosts] = useState(false);

  // Load authoritative posts from Supabase on mount & run safe idempotent migration
  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setIsLoadingServerPosts(true);
      const res = await fetchFeedPostsFromSupabase();
      if (!isMounted) return;
      setIsLoadingServerPosts(false);

      if (res.data && res.data.length > 0) {
        setPosts(res.data);
      }

      // If user is authenticated, check for any unmigrated authentic local posts
      if (userData?.id) {
        try {
          const migRes = await syncUserLocalPostsToSupabase(userData);
          if (migRes.migratedCount > 0 && isMounted) {
            setSyncStatusText(
              lang === 'ar'
                ? `✨ تمت مزامنة ${migRes.migratedCount} منشور خاص بك مع سحابة الكنيسة بنجاح`
                : `✨ Successfully synced ${migRes.migratedCount} of your posts to church cloud`
            );
            setTimeout(() => setSyncStatusText(null), 6000);
            // Re-fetch authoritative posts
            const fresh = await fetchFeedPostsFromSupabase();
            if (fresh.data && isMounted) {
              setPosts(fresh.data);
            }
          }
        } catch (migErr) {
          console.warn('Note on local feed migration:', migErr);
        }
      }
    }

    loadFeed();
    return () => { isMounted = false; };
  }, [userData?.id]);

  // 2. State controls
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; replyToAuthor?: string } | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [isOfficialAnnouncement, setIsOfficialAnnouncement] = useState(false);

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
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'youtube' | 'audio' | 'embed' | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [mediaSizeKb, setMediaSizeKb] = useState<number | null>(null);
  const [mediaProvider, setMediaProvider] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const isTeacher = userData?.role === 'teacher';

  // 3. Sorting logic
  const sortedPosts = useMemo(() => {
    const list = [...posts];

    switch (sortBy) {
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
  }, [posts, sortBy]);

  // 4. Post Reactions (Optimistic update with Supabase persistence & rollback)
  const handleReactPost = async (postId: string, reactionType: 'heart' | 'candle' | 'cross') => {
    setActionError(null);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [reactionType]: (p.reactions[reactionType] || 0) + 1
          }
        };
      }
      return p;
    }));

    const res = await toggleFeedReactionInSupabase(reactionType, { postId });
    if (res.error) {
      console.warn('Reaction write note:', res.error.message);
      setActionError(lang === 'ar' ? `تعذر تسجيل التفاعل على السحابة: ${res.error.message}` : `Reaction failed: ${res.error.message}`);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            reactions: {
              ...p.reactions,
              [reactionType]: Math.max(0, (p.reactions[reactionType] || 1) - 1)
            }
          };
        }
        return p;
      }));
    }
  };

  // 5. Comment Reactions (Optimistic update with Supabase persistence & rollback)
  const handleReactComment = async (postId: string, commentId: string, reactionType: 'heart' | 'candle' | 'cross') => {
    setActionError(null);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const currentReactions = c.reactions || { heart: 0, candle: 0, cross: 0 };
              return {
                ...c,
                reactions: {
                  ...currentReactions,
                  [reactionType]: (currentReactions[reactionType] || 0) + 1
                }
              };
            }
            return c;
          })
        };
      }
      return p;
    }));

    const res = await toggleFeedReactionInSupabase(reactionType, { commentId });
    if (res.error) {
      console.warn('Comment reaction write note:', res.error.message);
      setActionError(lang === 'ar' ? `تعذر تسجيل التفاعل: ${res.error.message}` : `Comment reaction failed: ${res.error.message}`);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments.map(c => {
              if (c.id === commentId) {
                const currentReactions = c.reactions || { heart: 0, candle: 0, cross: 0 };
                return {
                  ...c,
                  reactions: {
                    ...currentReactions,
                    [reactionType]: Math.max(0, (currentReactions[reactionType] || 1) - 1)
                  }
                };
              }
              return c;
            })
          };
        }
        return p;
      }));
    }
  };

  // 6. Reply Reactions
  const handleReactReply = (postId: string, commentId: string, replyId: string, reactionType: 'heart' | 'candle' | 'cross') => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: c.replies.map(r => {
                  if (r.id === replyId) {
                    const currentReactions = r.reactions || { heart: 0, candle: 0, cross: 0 };
                    return {
                      ...r,
                      reactions: {
                        ...currentReactions,
                        [reactionType]: (currentReactions[reactionType] || 0) + 1
                      }
                    };
                  }
                  return r;
                })
              };
            }
            return c;
          })
        };
      }
      return p;
    }));
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
      setActionError(lang === 'ar' ? `تعذر حفظ التعليق على السحابة: ${res.error.message}` : `Failed to save comment to cloud: ${res.error.message}`);
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

  // Media file upload handler (handles photos, videos, and audio recordings up to 150MB with zero cap)
  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file || !userData) return;

    setMediaError(null);
    setIsUploadingMedia(true);
    setUploadStatusText(
      type === 'image'
        ? (lang === 'ar' ? 'جارٍ حفظ الصورة في سحابة الكنيسة...' : 'Uploading photo to church cloud...')
        : type === 'video'
        ? (lang === 'ar' ? 'جارٍ رفع الفيديو (سعة غير محدودة)...' : 'Uploading video (unlimited capacity)...')
        : (lang === 'ar' ? 'جارٍ رفع التسجيل الصوتي للحن الكنسي...' : 'Uploading hymn audio recording...')
    );

    try {
      const res = await uploadFeedMediaToSupabase(file, userData.id);
      if (res.success && res.mediaUrl) {
        setSelectedMediaType(res.mediaType);
        setSelectedMediaUrl(res.mediaUrl);
        setMediaProvider(res.provider || null);
        setMediaSizeKb(res.sizeKb || null);
        setShowLinkInput(false);
      } else {
        setMediaError(res.error || (lang === 'ar' ? 'تعذر رفع الملف' : 'Upload failed'));
      }
    } catch (err: any) {
      setMediaError(err.message || 'Upload failed');
    } finally {
      setIsUploadingMedia(false);
      setUploadStatusText('');
      e.target.value = '';
    }
  };

  const handleApplyLink = () => {
    if (!linkInputValue.trim()) return;
    const parsed = extractEmbedMedia(linkInputValue.trim());
    if (parsed.mediaType !== 'unknown') {
      setSelectedMediaType(parsed.mediaType);
      setSelectedMediaUrl(parsed.embedUrl);
      setMediaProvider('external-stream');
      setMediaSizeKb(null);
      setMediaError(null);
      setShowLinkInput(false);
    } else {
      setMediaError(lang === 'ar' ? 'يرجى إدخال رابط يوتيوب أو جوجل درايف أو فيديو أو صوت صالح' : 'Please enter a valid YouTube, Google Drive, video or audio link');
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMediaType(null);
    setSelectedMediaUrl(null);
    setMediaProvider(null);
    setMediaSizeKb(null);
    setMediaError(null);
    setLinkInputValue('');
    setShowLinkInput(false);
  };

  // 8. Create New Post (Optimistic update with Supabase persistence & rollback)
  const handleCreatePost = async () => {
    if (!newPostText.trim() || !userData) return;
    setActionError(null);

    const tempId = 'post-' + Date.now().toString();
    const newPost: ExtendedPost = {
      id: tempId,
      authorId: userData.id,
      authorName: userData.fullName + (isTeacher ? ` (${lang === 'ar' ? 'خادم' : 'Servant'})` : ''),
      authorAvatar: userData.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userData.fullName,
      content: newPostText.trim(),
      createdAt: new Date().toISOString(),
      reactions: { heart: 0, candle: 0, cross: 0 },
      comments: [],
      isPinned: isTeacher && isOfficialAnnouncement,
      isAnnouncement: isTeacher && isOfficialAnnouncement,
      mediaType: selectedMediaType || undefined,
      mediaUrl: selectedMediaUrl || undefined,
      mediaProvider: mediaProvider || undefined,
    };

    const previousPosts = posts;
    setPosts(prev => [newPost, ...prev]);

    const postContent = newPostText.trim();
    const postMediaType = selectedMediaType;
    const postMediaUrl = selectedMediaUrl;
    const postMediaProvider = mediaProvider;
    const postPinned = isTeacher && isOfficialAnnouncement;

    setNewPostText("");
    setSelectedMediaType(null);
    setSelectedMediaUrl(null);
    setMediaProvider(null);
    setMediaSizeKb(null);
    setShowLinkInput(false);
    setLinkInputValue('');
    setMediaError(null);
    setIsOfficialAnnouncement(false);
    setIsComposeModalOpen(false);

    const res = await createFeedPostInSupabase({
      authorId: userData.id,
      authorName: newPost.authorName,
      authorAvatar: newPost.authorAvatar,
      content: postContent,
      mediaType: postMediaType || undefined,
      mediaUrl: postMediaUrl || undefined,
      mediaProvider: postMediaProvider || undefined,
      isPinned: postPinned,
      isAnnouncement: postPinned
    });

    if (res.error) {
      console.warn('Post creation error:', res.error);
      setActionError(lang === 'ar' ? `تعذر حفظ المشاركة على السحابة: ${res.error.message}` : `Failed to save post to cloud: ${res.error.message}`);
      setPosts(previousPosts);
    } else if (res.data?.id) {
      setPosts(prev => prev.map(p => p.id === tempId ? { ...p, id: res.data!.id } : p));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المنشور؟' : 'Are you sure you want to delete this post?')) {
      return;
    }
    setActionError(null);
    const previousPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));

    const res = await deleteFeedPostFromSupabase(postId);
    if (res.error) {
      console.warn('Post deletion error:', res.error);
      setActionError(lang === 'ar' ? `تعذر حذف المنشور: ${res.error.message}` : `Failed to delete post: ${res.error.message}`);
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
      setActionError(lang === 'ar' ? `تعذر تعديل التثبيت: ${res.error.message}` : `Pin toggle failed: ${res.error.message}`);
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
            {lang === 'ar' ? 'واحة مجتمع كنيسة القديس الأنبا موسى' : 'St. Moses Community Oasis'}
          </h1>
          <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
            {lang === 'ar' ? 'مشاركات روحية، تأملات البرية، وتواصل عائلة مدارس الأحد' : 'Spiritual reflections, desert verses & Sunday School fellowship'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
              ? (isCop ? 'Ϩⲓⲟⲩⲓ̀ ⲛ̀ⲟⲩⲧⲁⲙⲟ ⲛ̀ⲧⲉ ϯⲇⲓⲁⲕⲟⲛⲓⲁ ⲓⲉ ⲟⲩⲙⲉⲩⲓ' : lang === 'ar' ? 'نشر إعلان خدمة أو تأمل روحي' : 'Post Servant Announcement or Reflection') 
              : (isCop ? 'Ϣⲱⲡ ⲛ̀ⲟⲩⲣⲏϯ ⲓⲉ ⲟⲩⲙⲉⲩⲓ ⲛⲉⲙ ⲧⲉⲕⲉⲕⲕⲗⲏⲥⲓⲁ!' : lang === 'ar' ? 'شارك آية أو تأمل مع كنيستك!' : 'Share a verse or reflection with church!')}
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-4 my-8"
            >
              {/* Hidden file inputs */}
              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={e => handleMediaFileChange(e, 'image')} 
                accept="image/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={videoInputRef} 
                onChange={e => handleMediaFileChange(e, 'video')} 
                accept="video/mp4,video/webm,video/quicktime,video/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={audioInputRef} 
                onChange={e => handleMediaFileChange(e, 'audio')} 
                accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/*" 
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
                    setIsComposeModalOpen(false);
                    handleRemoveMedia();
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

              {/* Media Selection Actions */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'إرفاق وسائط مباشرة إلى السحابة الكنسية' : 'Direct Cloud Upload (High-Durability)'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon size={15} />
                    <span>{lang === 'ar' ? 'رفع صور عالية الدقة' : 'High-Res Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[var(--mousa-teal-deep)] border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Video size={15} />
                    <span>{lang === 'ar' ? 'رفع فيديو مباشر' : 'Upload Video'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Music size={15} />
                    <span>{lang === 'ar' ? 'تسجيل لحن كنسي (صوت MP3)' : 'Hymn Audio (MP3)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    disabled={isUploadingMedia}
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

              {/* Media Preview Box */}
              {selectedMediaUrl && (
                <div className="relative rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 p-2">
                  <div className="flex items-center justify-between pb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={12} />
                        {selectedMediaType === 'youtube'
                          ? (lang === 'ar' ? 'يوتيوب (سعة مجانية غير محدودة)' : 'YouTube Stream (0 Storage Used)')
                          : selectedMediaType === 'audio'
                          ? (lang === 'ar' ? `تسجيل لحن كنسي (~${mediaSizeKb || 0} ك.ب)` : `Hymn Audio (~${mediaSizeKb || 0} KB)`)
                          : selectedMediaType === 'video'
                          ? (lang === 'ar' ? `فيديو مباشر (~${mediaSizeKb || 0} ك.ب)` : `Direct Video (~${mediaSizeKb || 0} KB)`)
                          : selectedMediaType === 'embed'
                          ? (lang === 'ar' ? 'تضمين جوجل درايف / وسائط' : 'Google Drive / Media Embed')
                          : (lang === 'ar' ? `صورة كنسية (~${mediaSizeKb || 0} ك.ب)` : `Church Photo (~${mediaSizeKb || 0} KB)`)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>{lang === 'ar' ? 'إزالة' : 'Remove'}</span>
                    </button>
                  </div>

                  {selectedMediaType === 'youtube' ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe 
                        src={selectedMediaUrl} 
                        title="Preview" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : selectedMediaType === 'audio' ? (
                    <div className="p-3 bg-blue-50/80 dark:bg-slate-700 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                        <Volume2 size={16} />
                        <span>{lang === 'ar' ? 'معاينة التسجيل الصوتي للحن الكنسي' : 'Spiritual Hymn Recording Preview'}</span>
                      </div>
                      <audio src={selectedMediaUrl} controls className="w-full h-9 rounded-lg outline-none" />
                    </div>
                  ) : selectedMediaType === 'embed' ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe 
                        src={selectedMediaUrl} 
                        title="Embed Preview" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : selectedMediaType === 'video' ? (
                    <div className="relative rounded-xl overflow-hidden bg-black max-h-56">
                      <video 
                        src={selectedMediaUrl} 
                        controls 
                        playsInline 
                        className="w-full max-h-56 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 max-h-56">
                      <img 
                        src={selectedMediaUrl} 
                        alt="Preview" 
                        className="w-full max-h-56 object-cover rounded-xl"
                      />
                    </div>
                  )}
                </div>
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
                disabled={(!newPostText.trim() && !selectedMediaUrl) || isUploadingMedia}
                className={`w-full font-bold py-3.5 rounded-xl transition-colors shadow-md text-sm cursor-pointer flex items-center justify-center gap-2 ${
                  (newPostText.trim() || selectedMediaUrl) && !isUploadingMedia
                    ? 'bg-[var(--mousa-teal-deep)] text-[var(--mousa-gold)] hover:bg-blue-900'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={15} />
                <span>{isCop ? 'Ⲁⲣⲉϩ ⲟⲩⲟϩ ϩⲓⲟⲩⲓ̀ ϧⲉⲛ ϯⲕⲟⲓⲛⲱⲛⲓⲁ' : lang === 'ar' ? 'حفظ ونشر في المجتمع الآن' : 'Save & Publish Post'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Posts List */}
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
                      <p className="font-bold text-sm text-[var(--mousa-teal-deep)]">{post.authorName}</p>
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

              {/* Media Attachment (Photo / Direct Video / YouTube / Audio Hymn / Embed) */}
              {post.mediaUrl && (
                <div className="mb-4">
                  {post.mediaType === 'youtube' ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xs border border-gray-100">
                      <iframe 
                        src={post.mediaUrl} 
                        title="Church Video Embed" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="w-full h-full border-0" 
                      />
                    </div>
                  ) : post.mediaType === 'embed' ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xs border border-gray-100">
                      <iframe 
                        src={post.mediaUrl} 
                        title="Church Media Embed" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="w-full h-full border-0" 
                      />
                    </div>
                  ) : post.mediaType === 'audio' ? (
                    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-amber-50/80 dark:from-slate-800 dark:to-slate-850 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--mousa-teal-deep)] text-white flex items-center justify-center font-bold shadow-xs">
                          <Volume2 size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>{lang === 'ar' ? 'تسجيل ترتيل / لحن كنسي' : 'Hymn / Spiritual Audio Recording'}</span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-normal">
                              MP3
                            </span>
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {lang === 'ar' ? 'اضغط للتشغيل والاستماع للتدريب والبركة' : 'Tap play to listen and rehearse for Sunday School'}
                          </p>
                        </div>
                      </div>
                      <audio 
                        src={post.mediaUrl} 
                        controls 
                        preload="metadata" 
                        className="w-full h-10 rounded-xl outline-none" 
                      />
                    </div>
                  ) : post.mediaType === 'video' ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xs border border-gray-100">
                      <video 
                        src={post.mediaUrl} 
                        controls 
                        playsInline 
                        preload="metadata" 
                        className="w-full max-h-80 object-contain rounded-2xl bg-black" 
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => setLightboxImage(post.mediaUrl || null)}
                      className="relative rounded-2xl overflow-hidden bg-gray-900/5 dark:bg-black/30 shadow-xs border border-gray-200/70 dark:border-slate-800 group cursor-pointer max-w-md mx-auto"
                    >
                      <img 
                        src={post.mediaUrl} 
                        alt="Post media" 
                        loading="lazy"
                        className="w-full h-44 sm:h-52 object-cover rounded-2xl group-hover:scale-[1.02] transition-transform duration-200" 
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/75 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                          <Maximize2 size={13} />
                          {lang === 'ar' ? 'عرض بالحجم الكامل' : 'View Full Photo'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Post Reactions Bar */}
              <div className="flex items-center gap-2 border-t border-gray-100 pt-3 pb-1 flex-wrap">
                <motion.button 
                  whileTap={{ scale: 0.85 }} 
                  onClick={() => handleReactPost(post.id, 'heart')} 
                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-500 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  <Heart size={14} fill="currentColor" />
                  <span>{post.reactions.heart}</span>
                </motion.button>
                
                <motion.button 
                  whileTap={{ scale: 0.85 }} 
                  onClick={() => handleReactPost(post.id, 'candle')} 
                  className="flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100 text-[var(--mousa-gold)] px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="text-sm leading-none">🕯️</span>
                  <span>{post.reactions.candle}</span>
                </motion.button>
                
                <motion.button 
                  whileTap={{ scale: 0.85 }} 
                  onClick={() => handleReactPost(post.id, 'cross')} 
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[var(--mousa-teal-deep)] px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="text-sm leading-none">✝️</span>
                  <span>{post.reactions.cross}</span>
                </motion.button>
                
                <div className="flex-1"></div>
                
                <button 
                  onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-[var(--mousa-teal-deep)] font-bold text-xs transition-colors cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>
                    {post.comments.reduce((total, c) => total + 1 + (c.replies?.length || 0), 0)} {lang === 'ar' ? 'تعليقات وردود' : 'Comments'}
                  </span>
                </button>
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
                            <div className="flex items-center gap-1.5 pt-1">
                              <button 
                                onClick={() => handleReactComment(post.id, comment.id, 'heart')}
                                className="text-[10px] bg-white border border-gray-200 hover:bg-red-50 hover:text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-gray-600 transition-colors cursor-pointer"
                              >
                                <span>❤️</span>
                                <span>{comment.reactions?.heart || 0}</span>
                              </button>
                              <button 
                                onClick={() => handleReactComment(post.id, comment.id, 'candle')}
                                className="text-[10px] bg-white border border-gray-200 hover:bg-amber-50 hover:text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-gray-600 transition-colors cursor-pointer"
                              >
                                <span>🕯️</span>
                                <span>{comment.reactions?.candle || 0}</span>
                              </button>
                              <button 
                                onClick={() => handleReactComment(post.id, comment.id, 'cross')}
                                className="text-[10px] bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-gray-600 transition-colors cursor-pointer"
                              >
                                <span>✝️</span>
                                <span>{comment.reactions?.cross || 0}</span>
                              </button>
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

      {/* Full-Screen Image Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full transition-colors cursor-pointer z-10"
              >
                <X size={20} />
              </button>
              <img 
                src={lightboxImage} 
                alt="Enlarged Church Photo" 
                className="w-full h-full max-h-[85vh] object-contain rounded-2xl" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
