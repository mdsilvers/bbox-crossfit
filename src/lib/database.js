import { supabase } from './supabase';

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

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) throw error;
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

export async function getTodayWod(userGroup) {
  const today = new Date().toISOString().split('T')[0];

  // Try combined first
  let wod = await getWodByDateAndGroup(today, 'combined');

  // If no combined WOD, try user's specific group
  if (!wod && userGroup) {
    wod = await getWodByDateAndGroup(today, userGroup);
  }

  return wod;
}

export async function getAllWods() {
  const { data, error } = await supabase
    .from('wods')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRecentWods(userGroup, daysBack = 7) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  const startDateStr = startDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // Get WODs that match user's group or combined, excluding today
  const { data, error } = await supabase
    .from('wods')
    .select('*')
    .gte('date', startDateStr)
    .lt('date', todayStr)
    .or(`group_type.eq.combined,group_type.eq.${userGroup}`)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
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
      posted_by: userId,
      posted_by_name: userName,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWod(id, wod) {
  const { data, error } = await supabase
    .from('wods')
    .update({
      name: wod.name || null,
      date: wod.date,
      type: wod.type,
      group_type: wod.group,
      movements: wod.movements,
      notes: wod.notes || null,
      updated_at: new Date().toISOString(),
    })
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

export async function getResultsByAthlete(athleteId) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllResults() {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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
      photo_url: result.photoData || null, // For now, store base64 directly; could migrate to Supabase Storage later
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
    .select('*')
    .eq('date', date);

  if (error) throw error;
  return data || [];
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

// Transform Supabase WOD to app WOD format
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
    postedBy: wod.posted_by_name,
    postedAt: wod.created_at,
  };
}

// Transform Supabase result to app result format
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
    photoData: result.photo_url,
    loggedAt: result.created_at,
  };
}
