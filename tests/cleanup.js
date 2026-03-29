import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export async function cleanup() {
  console.log('Cleaning up test data...');

  // Sign in as coach to delete coach-owned data
  await supabase.auth.signInWithPassword({
    email: process.env.TEST_COACH_EMAIL || 'testcoach@bbox.test',
    password: process.env.TEST_COACH_PASSWORD || 'TestCoach123!',
  });

  // Delete strength program data (coach-owned, FK order: sessions before programs)
  await supabase.from('program_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('strength_programs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Delete in dependency order: comments/reactions → results → wods
  const { data: results } = await supabase.from('results').select('id');
  if (results?.length) {
    const resultIds = results.map(r => r.id);
    await supabase.from('result_reactions').delete().in('result_id', resultIds);
    await supabase.from('result_comments').delete().in('result_id', resultIds);
  }

  // Delete coach's results
  await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Delete all WODs (coach has permission)
  await supabase.from('wods').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Delete badges
  await supabase.from('user_badges').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  await supabase.auth.signOut();

  // Sign in as athlete to delete their results and badges
  await supabase.auth.signInWithPassword({
    email: process.env.TEST_ATHLETE_EMAIL || 'testathlete@bbox.test',
    password: process.env.TEST_ATHLETE_PASSWORD || 'TestAthlete123!',
  });

  await supabase.from('athlete_enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_badges').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  await supabase.auth.signOut();

  console.log('  Cleanup complete.\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  cleanup().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}
