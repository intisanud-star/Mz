import React, { useState } from 'react';
import { FeedVideoPlayer } from './WorldMarketplace';
import { MessageCircle, Heart, Share2 } from 'lucide-react';

interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  likes: number;
  likedBy: string[];
  commentsCount: number;
  reshares: number;
  timestamp: any;
  isOfficial?: boolean;
  schoolId?: string;
  authorRole?: string;
  schoolName?: string;
  resharedFrom?: {
    id: string;
    authorName: string;
    content: string;
  };
}

export const UserPostsTab = ({ posts, userId }: { posts: Post[], userId: string }) => {
  const userPosts = posts.filter(p => p.authorUid === userId);

  if (userPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-sm font-bold text-ink">No Posts Yet</p>
        <p className="text-xs text-muted mt-1">This user has not posted anything yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      {userPosts.map((post) => (
        <div key={post.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-3">
             <img src={post.authorPhoto} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
             <p className="text-xs font-bold text-ink">{post.authorName}</p>
          </div>
          <p className="text-sm text-ink mb-3">{post.content}</p>
          {post.mediaUrl && (
            post.mediaType === 'video' ? 
            <FeedVideoPlayer src={post.mediaUrl} className="w-full aspect-video rounded-lg mb-3" controls={true} /> :
            <img src={post.mediaUrl} className="w-full aspect-video rounded-lg object-cover mb-3" referrerPolicy="no-referrer" />
          )}
          <div className="flex items-center gap-4 text-muted mt-auto pt-2">
             <div className="flex items-center gap-1 text-[10px] font-bold"><Heart size={14} /> {post.likes}</div>
             <div className="flex items-center gap-1 text-[10px] font-bold"><MessageCircle size={14} /> {post.commentsCount}</div>
             <div className="flex items-center gap-1 text-[10px] font-bold"><Share2 size={14} /> {post.reshares}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
