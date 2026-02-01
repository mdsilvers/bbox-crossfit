import React, { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import CommentBubble from './CommentBubble';

export default function CommentThread({ resultId, comments = [], currentUser, onPost, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!body.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onPost(resultId, body.trim());
      setBody('');
    } catch {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const count = comments.length;

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Comment'}</span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {comments.map(comment => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              isOwnComment={comment.author_id === currentUser?.id}
              onDelete={(commentId) => onDelete(resultId, commentId)}
            />
          ))}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              className="flex-1 bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:text-slate-400 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {body.length > 450 && (
            <p className="text-slate-500 text-xs">{500 - body.length} characters remaining</p>
          )}
        </div>
      )}
    </div>
  );
}
