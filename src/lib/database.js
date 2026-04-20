import { supabase } from './supabase';
import { getLocalToday } from './constants';

// Explicit column lists for list queries — omits `photo_url` (base64, MBs per row).
// `has_photo` is a generated column (see supabase-migration-photo-optimization.sql)
// that lets the UI know whether to render a lazy-load thumbnail.
// Single-row queries continue to select('*') so the viewer / edit form gets photo_url.
const WOD_LIST_COLUMNS = 'id, name, date, type, group_type, movements, notes, posted_by, posted_by_name, strength_program_id, program_session_override, has_photo, created_at, updated_at';
const RESULT_LIST_COLUMNS = 'id, wod_id, athlete_id, athlete_name, athlete_email, date, time, movements, notes, custom_wod_name, custom_wod_type, rx, strength_score, has_photo, created_at, updated_at';

// ==================== AUTH FUNCTIONS ====================

export async function signUp(email, password, name, role, group) {
  // Create auth user with metadata
  // The database trigger will automatically create the profile
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        role,
        group_type: group,
      },
    },
  });

  if (authError) throw authError;

  return authData;
}

export async function signIn(email, password) {
  // Clear any existing session first to prevent stale session issues
  await supabase.auth.signOut({ scope: 'local' });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  // Sign out from all sessions
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found');
  return data;
}

// ==================== WOD FUNCTIONS ====================

export async function getWodByDateAndGroup(date, group) {
  const { data, error } = await supabase
    .from('wods')
    .select('*')
    .eq('date', date)
    .eq('group_type', group)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTodayWod(userGroup, role) {
  const today = getLocalToday();

  // Coaches see any WOD for today regardless of group
  if (role === 'coach') {
    const { data, error } = await supabase
      .from('wods')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Athletes: check combined and group-specific in parallel
  const queries = [getWodByDateAndGroup(today, 'combined')];
  if (userGroup) {
    queries.push(getWodByDateAndGroup(today, userGroup));
  }
  const results = await Promise.all(queries);
  return results[0] || results[1] || null;
}

export async function getAllWods(limit = 365) {
  const { data, error } = await supabase
    .from('wods')
    .select(WOD_LIST_COLUMNS)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getRecentWods(userGroup, daysBack = 7) {
  const todayStr = getLocalToday();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

  // Get WODs that match user's group or combined, excluding today
  const { data, error } = await supabase
    .from('wods')
    .select(WOD_LIST_COLUMNS)
    .gte('date', startDateStr)
    .lt('date', todayStr)
    .or(`group_type.eq.combined,group_type.eq.${userGroup}`)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getWodPhoto(id) {
  const { data, error } = await supabase
    .from('wods')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data?.photo_url || null;
}

export async function createWod(wod, userId, userName) {
  const { data, error } = await supabase
    .from('wods')
    .insert({
      name: wod.name || null,
      date: wod.date,
      type: wod.type,
      group_type: wod.group,
      movements: wod.movements,
      notes: wod.notes || null,
      photo_url: wod.photoData || null,
      posted_by: userId,
      posted_by_name: userName,
      strength_program_id: wod.strengthProgramId || null,
      program_session_override: wod.programSessionOverride || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWod(id, wod, coachId, coachName) {
  const updates = {
    name: wod.name || null,
    date: wod.date,
    type: wod.type,
    group_type: wod.group,
    movements: wod.movements,
    notes: wod.notes || null,
    photo_url: wod.photoData || null,
    strength_program_id: wod.strengthProgramId || null,
    program_session_override: wod.programSessionOverride || null,
    updated_at: new Date().toISOString(),
  };

  if (coachId) {
    updates.posted_by = coachId;
    updates.posted_by_name = coachName;
  }

  const { data, error } = await supabase
    .from('wods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWod(id) {
  const { error } = await supabase
    .from('wods')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function checkWodConflict(date, group, excludeId = null) {
  // Check for conflicts based on group type
  if (group === 'combined') {
    // Check if mens or womens WOD already exists
    const { data: existing } = await supabase
      .from('wods')
      .select('id, group_type')
      .eq('date', date)
      .in('group_type', ['mens', 'womens']);

    if (existing && existing.length > 0) {
      const conflicting = existing.find(w => w.id !== excludeId);
      if (conflicting) {
        return {
          conflict: true,
          message: `Cannot post a Combined WOD - a ${conflicting.group_type === 'mens' ? "Men's" : "Women's"} WOD already exists for ${date}. Delete it first or post a group-specific WOD.`
        };
      }
    }
  } else {
    // Posting mens or womens - check if combined exists
    const { data: combined } = await supabase
      .from('wods')
      .select('id')
      .eq('date', date)
      .eq('group_type', 'combined')
      .neq('id', excludeId || '00000000-0000-0000-0000-000000000000');

    if (combined && combined.length > 0) {
      return {
        conflict: true,
        message: `Cannot post a ${group === 'mens' ? "Men's" : "Women's"} WOD - a Combined WOD already exists for ${date}. Delete it first or edit the existing WOD.`
      };
    }

    // Check if same group WOD already exists
    const { data: sameGroup } = await supabase
      .from('wods')
      .select('id')
      .eq('date', date)
      .eq('group_type', group)
      .neq('id', excludeId || '00000000-0000-0000-0000-000000000000');

    if (sameGroup && sameGroup.length > 0) {
      return {
        conflict: true,
        message: `A ${group === 'mens' ? "Men's" : "Women's"} WOD already exists for ${date}. Edit or delete it instead.`
      };
    }
  }

  return { conflict: false };
}

// ==================== RESULTS FUNCTIONS ====================

export async function getResultsByAthlete(athleteId, limit = 100) {
  const { data, error } = await supabase
    .from('results')
    .select(RESULT_LIST_COLUMNS)
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getAllResults(limit = 100) {
  const { data, error } = await supabase
    .from('results')
    .select(RESULT_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getResultPhoto(id) {
  const { data, error } = await supabase
    .from('results')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data?.photo_url || null;
}

export async function getResultByAthleteAndDate(athleteId, date) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createResult(result, userId, userName, userEmail) {
  const { data, error } = await supabase
    .from('results')
    .insert({
      wod_id: result.wodId || null,
      athlete_id: userId,
      athlete_name: userName,
      athlete_email: userEmail,
      date: result.date,
      time: result.time || null,
      movements: result.movements,
      notes: result.notes || null,
      photo_url: result.photoData || null,
      custom_wod_name: result.customWodName || null,
      custom_wod_type: result.customWodType || null,
      rx: result.rx ?? 'rx',
      strength_score: result.strengthScore || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateResult(id, result) {
  const { data, error } = await supabase
    .from('results')
    .update({
      time: result.time || null,
      movements: result.movements,
      notes: result.notes || null,
      photo_url: result.photoData || null,
      custom_wod_name: result.customWodName || null,
      custom_wod_type: result.customWodType || null,
      rx: result.rx ?? 'rx',
      strength_score: result.strengthScore || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteResult(id) {
  const { error } = await supabase
    .from('results')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getResultsForDate(date) {
  const { data, error } = await supabase
    .from('results')
    .select(RESULT_LIST_COLUMNS)
    .eq('date', date);

  if (error) throw error;
  return data || [];
}

// ==================== BENCHMARK RESULTS FUNCTIONS ====================

export async function getAllResultsForBenchmark(wodIds) {
  // wodIds is an array of WOD IDs that match the benchmark name
  if (!wodIds || wodIds.length === 0) return [];

  const { data, error } = await supabase
    .from('results')
    .select(RESULT_LIST_COLUMNS)
    .in('wod_id', wodIds)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ==================== BODY MEASUREMENTS FUNCTIONS ====================

export async function getBodyMeasurements(userId) {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBodyMeasurement(userId, measurement) {
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId,
      measured_at: measurement.measured_at || new Date().toISOString().split('T')[0],
      weight_kgs: measurement.weight_kgs || null,
      body_fat_pct: measurement.body_fat_pct || null,
      chest_in: measurement.chest_in || null,
      waist_in: measurement.waist_in || null,
      hips_in: measurement.hips_in || null,
      left_arm_in: measurement.left_arm_in || null,
      right_arm_in: measurement.right_arm_in || null,
      left_thigh_in: measurement.left_thigh_in || null,
      right_thigh_in: measurement.right_thigh_in || null,
      notes: measurement.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBodyMeasurement(id, measurement) {
  const { data, error } = await supabase
    .from('body_measurements')
    .update({
      measured_at: measurement.measured_at,
      weight_kgs: measurement.weight_kgs || null,
      body_fat_pct: measurement.body_fat_pct || null,
      chest_in: measurement.chest_in || null,
      waist_in: measurement.waist_in || null,
      hips_in: measurement.hips_in || null,
      left_arm_in: measurement.left_arm_in || null,
      right_arm_in: measurement.right_arm_in || null,
      left_thigh_in: measurement.left_thigh_in || null,
      right_thigh_in: measurement.right_thigh_in || null,
      notes: measurement.notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBodyMeasurement(id) {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== LEADERBOARD FUNCTIONS ====================

export async function getLeaderboardForDate(date, wodId) {
  let query = supabase
    .from('results')
    .select(`${RESULT_LIST_COLUMNS}, profiles!athlete_id(group_type)`)
    .eq('date', date);

  if (wodId) {
    query = query.eq('wod_id', wodId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(r => ({
    ...resultToAppFormat(r),
    groupType: r.profiles?.group_type,
  }));
}

// ==================== REACTION FUNCTIONS ====================

export async function getReactionsForResults(resultIds) {
  if (!resultIds || resultIds.length === 0) return [];

  const { data, error } = await supabase
    .from('result_reactions')
    .select('*')
    .in('result_id', resultIds);

  if (error) throw error;
  return data || [];
}

export async function addReaction(resultId, userId, reactionType) {
  const { data, error } = await supabase
    .from('result_reactions')
    .insert({
      result_id: resultId,
      user_id: userId,
      reaction_type: reactionType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeReaction(resultId, userId, reactionType) {
  const { error } = await supabase
    .from('result_reactions')
    .delete()
    .eq('result_id', resultId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType);

  if (error) throw error;
}

// ==================== COMMENT FUNCTIONS ====================

export async function getCommentsForResults(resultIds) {
  if (!resultIds || resultIds.length === 0) return [];

  const { data, error } = await supabase
    .from('result_comments')
    .select('*')
    .in('result_id', resultIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addComment(resultId, userId, userName, userRole, body) {
  const { data, error } = await supabase
    .from('result_comments')
    .insert({
      result_id: resultId,
      author_id: userId,
      author_name: userName,
      author_role: userRole,
      body,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('result_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

// ==================== BADGE FUNCTIONS ====================

export async function getUserBadges(userId) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function awardBadge(userId, badgeKey) {
  const { data, error } = await supabase
    .from('user_badges')
    .upsert(
      { user_id: userId, badge_key: badgeKey },
      { onConflict: 'user_id,badge_key' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function awardBadges(userId, badgeKeys) {
  if (!badgeKeys || badgeKeys.length === 0) return;
  const rows = badgeKeys.map(key => ({
    user_id: userId,
    badge_key: key,
  }));
  const { error } = await supabase
    .from('user_badges')
    .upsert(rows, { onConflict: 'user_id,badge_key' });
  if (error) throw error;
}

export async function getAllUserBadges() {
  const { data, error } = await supabase
    .from('user_badges')
    .select('user_id, badge_key');

  if (error) throw error;

  // Group by user_id -> [badge_key, ...]
  const grouped = {};
  (data || []).forEach(row => {
    if (!grouped[row.user_id]) grouped[row.user_id] = [];
    grouped[row.user_id].push(row.badge_key);
  });
  return grouped;
}

export async function getAllRecentBadges(limit = 20) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, profiles!user_id(name)')
    .order('earned_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updateProfileStreak(userId, streakWeeks, bestStreak) {
  const { error } = await supabase
    .from('profiles')
    .update({
      streak_weeks: streakWeeks,
      best_streak_weeks: bestStreak,
    })
    .eq('id', userId);

  if (error) throw error;
}

// ==================== COACH FUNCTIONS ====================

export async function getAllCoaches() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'coach')
    .order('name');

  if (error) throw error;
  return data || [];
}

// ==================== STRENGTH PROGRAM FUNCTIONS ====================

export async function getActiveProgram() {
  const { data, error } = await supabase
    .from('strength_programs')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllPrograms() {
  const { data, error } = await supabase
    .from('strength_programs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createProgram(program, userId, userName) {
  const { data, error } = await supabase
    .from('strength_programs')
    .insert({
      name: program.name,
      exercise: program.exercise,
      duration_weeks: program.durationWeeks,
      sessions_per_week: program.sessionsPerWeek,
      total_sessions: program.totalSessions,
      status: program.status || 'draft',
      created_by: userId,
      created_by_name: userName,
      notes: program.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgram(id, program) {
  const { data, error } = await supabase
    .from('strength_programs')
    .update({
      name: program.name,
      exercise: program.exercise,
      duration_weeks: program.durationWeeks,
      sessions_per_week: program.sessionsPerWeek,
      total_sessions: program.totalSessions,
      notes: program.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function activateProgram(id) {
  // Deactivate any currently active program first
  await supabase
    .from('strength_programs')
    .update({ status: 'completed' })
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('strength_programs')
    .update({ status: 'active' })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deactivateProgram(id) {
  const { data, error } = await supabase
    .from('strength_programs')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteProgram(id) {
  const { error } = await supabase
    .from('strength_programs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ==================== PROGRAM SESSION FUNCTIONS ====================

export async function getSessionsForProgram(programId) {
  const { data, error } = await supabase
    .from('program_sessions')
    .select('*')
    .eq('program_id', programId)
    .order('session_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertProgramSessions(programId, sessions) {
  // Delete existing sessions and replace with new set
  await supabase
    .from('program_sessions')
    .delete()
    .eq('program_id', programId);

  if (sessions.length === 0) return [];

  const rows = sessions.map((s, i) => ({
    program_id: programId,
    session_number: i + 1,
    sets: s.sets,
    reps: s.reps,
    percentage: s.percentage,
    notes: s.notes || null,
  }));

  const { data, error } = await supabase
    .from('program_sessions')
    .insert(rows)
    .select();
  if (error) throw error;
  return data || [];
}

// ==================== ENROLLMENT FUNCTIONS ====================

export async function getMyEnrollment(programId, athleteId) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .select('*')
    .eq('program_id', programId)
    .eq('athlete_id', athleteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllEnrollments(programId) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .select('*, profiles!athlete_id(name, email)')
    .eq('program_id', programId);
  if (error) throw error;
  return data || [];
}

export async function enrollAthlete(programId, athleteId, oneRepMax) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .upsert(
      {
        program_id: programId,
        athlete_id: athleteId,
        one_rep_max: oneRepMax,
        current_session: 1,
      },
      { onConflict: 'program_id,athlete_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOneRepMax(enrollmentId, oneRepMax) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .update({ one_rep_max: oneRepMax })
    .eq('id', enrollmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function advanceSession(enrollmentId, currentSession, totalSessions) {
  const nextSession = Math.min(currentSession + 1, totalSessions);
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .update({ current_session: nextSession })
    .eq('id', enrollmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function overrideAllEnrollments(programId, sessionNumber) {
  const { error } = await supabase
    .from('athlete_enrollments')
    .update({ current_session: sessionNumber })
    .eq('program_id', programId);
  if (error) throw error;
}

// ==================== HELPER FUNCTIONS ====================

// Transform Supabase profile to app user format
export function profileToUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    group: profile.group_type,
    createdAt: profile.created_at,
  };
}

// Transform Supabase WOD to app WOD format.
// `photoData` is populated on single-row queries (select * on getTodayWod etc.)
// but omitted on list queries; `hasPhoto` is always populated (generated column).
export function wodToAppFormat(wod) {
  if (!wod) return null;
  return {
    id: wod.id,
    name: wod.name,
    date: wod.date,
    type: wod.type,
    group: wod.group_type,
    movements: wod.movements,
    notes: wod.notes,
    photoData: wod.photo_url ?? null,
    hasPhoto: wod.has_photo ?? !!wod.photo_url,
    postedById: wod.posted_by,
    postedBy: wod.posted_by_name,
    postedAt: wod.created_at,
    strengthProgramId: wod.strength_program_id,
    programSessionOverride: wod.program_session_override,
  };
}

// Transform Supabase result to app result format.
// See wodToAppFormat for photoData/hasPhoto semantics.
export function resultToAppFormat(result) {
  if (!result) return null;
  return {
    id: result.id,
    wodId: result.wod_id,
    date: result.date,
    athleteName: result.athlete_name,
    athleteEmail: result.athlete_email,
    athleteId: result.athlete_id,
    time: result.time,
    movements: result.movements,
    notes: result.notes,
    photoData: result.photo_url ?? null,
    hasPhoto: result.has_photo ?? !!result.photo_url,
    customWodName: result.custom_wod_name,
    customWodType: result.custom_wod_type,
    rx: result.rx ?? 'rx',
    strengthScore: result.strength_score,
    loggedAt: result.created_at,
  };
}
