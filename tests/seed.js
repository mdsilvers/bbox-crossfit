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

const TEST_COACH = {
  email: process.env.TEST_COACH_EMAIL || 'testcoach@bbox.test',
  password: process.env.TEST_COACH_PASSWORD || 'TestCoach123!',
  name: 'Test Coach',
  role: 'coach',
  group_type: 'mens',
};

const TEST_ATHLETE = {
  email: process.env.TEST_ATHLETE_EMAIL || 'testathlete@bbox.test',
  password: process.env.TEST_ATHLETE_PASSWORD || 'TestAthlete123!',
  name: 'Test Athlete',
  role: 'athlete',
  group_type: 'mens',
};

async function createTestUser(user) {
  // Try signing in first — user may already exist
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (signInData?.user) {
    console.log(`  ✓ ${user.role} already exists: ${user.email}`);
    await supabase.auth.signOut();
    return signInData.user;
  }

  // Create new user
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: {
        name: user.name,
        role: user.role,
        group_type: user.group_type,
      },
    },
  });

  if (error) {
    if (error.message?.includes('already registered')) {
      console.log(`  ✓ ${user.role} already registered: ${user.email}`);
      return null;
    }
    throw new Error(`Failed to create ${user.role}: ${error.message}`);
  }

  console.log(`  ✓ Created ${user.role}: ${user.email}`);
  await supabase.auth.signOut();
  return data.user;
}

export async function seed() {
  console.log('\nSeeding test database...');
  console.log(`  Supabase: ${process.env.VITE_SUPABASE_URL}`);

  await createTestUser(TEST_COACH);
  await createTestUser(TEST_ATHLETE);

  console.log('  Seed complete.\n');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
