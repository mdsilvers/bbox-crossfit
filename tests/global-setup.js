import { seed } from './seed.js';
import { cleanup } from './cleanup.js';

export default async function globalSetup() {
  await cleanup();
  await seed();
}
