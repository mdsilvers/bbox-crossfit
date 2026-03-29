import { describe, it, expect, vi } from 'vitest';

// Mock the database module so supabase.js (which references `window`) is never loaded
vi.mock('../../src/lib/database', () => ({}));

import { roundToNearest, calculateWorkingWeight } from '../../src/hooks/useStrengthProgram';

describe('roundToNearest', () => {
  it('rounds to nearest 2.5 by default', () => {
    expect(roundToNearest(117.6)).toBe(117.5);
    expect(roundToNearest(118.8)).toBe(120);
    expect(roundToNearest(120)).toBe(120);
    expect(roundToNearest(121.25)).toBe(122.5);
  });
  it('rounds to custom increment', () => {
    expect(roundToNearest(117.6, 5)).toBe(120);
    expect(roundToNearest(122, 5)).toBe(120);
  });
});

describe('calculateWorkingWeight', () => {
  it('calculates 80% of 150kg', () => {
    expect(calculateWorkingWeight(150, 80)).toBe(120);
  });
  it('calculates 85% of 147kg and rounds', () => {
    // 147 * 0.85 = 124.95 → rounds to 125
    expect(calculateWorkingWeight(147, 85)).toBe(125);
  });
  it('calculates 105% for PR attempt', () => {
    // 150 * 1.05 = 157.5 → exact
    expect(calculateWorkingWeight(150, 105)).toBe(157.5);
  });
  it('calculates 90% of 120kg', () => {
    // 120 * 0.9 = 108 → exact
    expect(calculateWorkingWeight(120, 90)).toBe(107.5);
  });
});
