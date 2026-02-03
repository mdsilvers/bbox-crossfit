import { useState, useCallback, useRef } from 'react';
import * as db from '../lib/database';

export function useSocial(currentUser) {
  const [reactions, setReactions] = useState({});  // resultId -> reaction[]
  const [comments, setComments] = useState({});    // resultId -> comment[]
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [loadingComments, setLoadingComments] = useState({});

  // ==================== REACTIONS ====================

  const loadReactionsForResults = useCallback(async (resultIds) => {
    if (!resultIds || resultIds.length === 0) return;
    setLoadingReactions(true);
    try {
      const data = await db.getReactionsForResults(resultIds);
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.result_id]) grouped[r.result_id] = [];
        grouped[r.result_id].push(r);
      });
      setReactions(prev => ({ ...prev, ...grouped }));
      // Ensure result IDs with no reactions are set to empty array
      resultIds.forEach(id => {
        if (!grouped[id]) {
          setReactions(prev => ({ ...prev, [id]: prev[id] || [] }));
        }
      });
    } catch (error) {
      console.error('Error loading reactions:', error);
    } finally {
      setLoadingReactions(false);
    }
  }, []);

  const toggleReaction = useCallback(async (resultId, reactionType) => {
    if (!currentUser) return;

    const existing = (reactionsRef.current[resultId] || []).find(
      r => r.user_id === currentUser.id && r.reaction_type === reactionType
    );

    // Optimistic update
    if (existing) {
      setReactions(prev => ({
        ...prev,
        [resultId]: (prev[resultId] || []).filter(r => r.id !== existing.id),
      }));
      try {
        await db.removeReaction(resultId, currentUser.id, reactionType);
      } catch (error) {
        // Revert on error
        setReactions(prev => ({
          ...prev,
          [resultId]: [...(prev[resultId] || []), existing],
        }));
        console.error('Error removing reaction:', error);
      }
    } else {
      const optimistic = {
        id: `temp-${Date.now()}`,
        result_id: resultId,
        user_id: currentUser.id,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
      };
      setReactions(prev => ({
        ...prev,
        [resultId]: [...(prev[resultId] || []), optimistic],
      }));
      try {
        const real = await db.addReaction(resultId, currentUser.id, reactionType);
        setReactions(prev => ({
          ...prev,
          [resultId]: (prev[resultId] || []).map(r =>
            r.id === optimistic.id ? real : r
          ),
        }));
      } catch (error) {
        // Revert on error
        setReactions(prev => ({
          ...prev,
          [resultId]: (prev[resultId] || []).filter(r => r.id !== optimistic.id),
        }));
        console.error('Error adding reaction:', error);
      }
    }
  }, [currentUser]);

  // ==================== COMMENTS ====================

  const loadCommentsForResults = useCallback(async (resultIds) => {
    if (!resultIds || resultIds.length === 0) return;
    const loadingState = {};
    resultIds.forEach(id => { loadingState[id] = true; });
    setLoadingComments(prev => ({ ...prev, ...loadingState }));

    try {
      const data = await db.getCommentsForResults(resultIds);
      const grouped = {};
      data.forEach(c => {
        if (!grouped[c.result_id]) grouped[c.result_id] = [];
        grouped[c.result_id].push(c);
      });
      setComments(prev => ({ ...prev, ...grouped }));
      resultIds.forEach(id => {
        if (!grouped[id]) {
          setComments(prev => ({ ...prev, [id]: prev[id] || [] }));
        }
      });
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      const doneState = {};
      resultIds.forEach(id => { doneState[id] = false; });
      setLoadingComments(prev => ({ ...prev, ...doneState }));
    }
  }, []);

  const postComment = useCallback(async (resultId, body) => {
    if (!currentUser || !body.trim()) return;

    try {
      const newComment = await db.addComment(
        resultId,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        body.trim()
      );
      setComments(prev => ({
        ...prev,
        [resultId]: [...(prev[resultId] || []), newComment],
      }));
      return newComment;
    } catch (error) {
      console.error('Error posting comment:', error);
      throw error;
    }
  }, [currentUser]);

  const removeComment = useCallback(async (resultId, commentId) => {
    const prev = commentsRef.current[resultId] || [];
    // Optimistic
    setComments(p => ({
      ...p,
      [resultId]: (p[resultId] || []).filter(c => c.id !== commentId),
    }));
    try {
      await db.deleteComment(commentId);
    } catch (error) {
      // Revert
      setComments(p => ({ ...p, [resultId]: prev }));
      console.error('Error deleting comment:', error);
    }
  }, []);

  return {
    reactions,
    comments,
    loadingReactions,
    loadingComments,
    loadReactionsForResults,
    toggleReaction,
    loadCommentsForResults,
    postComment,
    removeComment,
  };
}
