import { Post } from '../types';

export type FeedDisplayState = 'loading' | 'error' | 'empty' | 'posts';

export function getFeedDisplayState(
  isLoading: boolean,
  error: string | null,
  posts: Post[]
): FeedDisplayState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  return posts.length > 0 ? 'posts' : 'empty';
}
