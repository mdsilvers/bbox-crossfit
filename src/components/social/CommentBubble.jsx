import React from 'react';
import { Trash2 } from 'lucide-react';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CommentBubble({ comment, isOwnComment, onDelete }) {
  const isCoach = comment.author_role === 'coach';

  return (
    <div className={`rounded-lg p-3 ${
      isCoach ? 'bg-red-600/10 border border-red-600/20' : 'bg-slate-700/50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">{comment.author_name}</span>
          {isCoach && (
            <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
              Coach
            </span>
          )}
          <span className="text-slate-500 text-xs">{timeAgo(comment.created_at)}</span>
        </div>
        {isOwnComment && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(comment.id);
            }}
            className="text-slate-500 hover:text-red-400 p-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-slate-300 text-sm">{comment.body}</p>
    </div>
  );
}
