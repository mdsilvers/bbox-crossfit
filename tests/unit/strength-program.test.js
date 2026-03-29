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
  it('rounds 0 to 0', () => {
    expect(roundToNearest(0)).toBe(0);
  });
  it('rounds small values', () => {
    // 0.5 / 2.5 = 0.2 → Math.round(0.2) = 0 → 0 * 2.5 = 0
    expect(roundToNearest(0.5)).toBe(0);
    // 1.25 / 2.5 = 0.5 → Math.round(0.5) = 1 → 1 * 2.5 = 2.5
    expect(roundToNearest(1.25)).toBe(2.5);
  });
  it('handles negative values', () => {
    // -50 / 2.5 = -20 → Math.round(-20) = -20 → -20 * 2.5 = -50
    expect(roundToNearest(-50)).toBe(-50);
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
  it('returns 0 for 0%', () => {
    expect(calculateWorkingWeight(150, 0)).toBe(0);
  });
  it('handles high percentages (150%)', () => {
    // 150 * 1.5 = 225 → exact
    expect(calculateWorkingWeight(150, 150)).toBe(225);
  });
  it('handles very small 1RM', () => {
    // 20 * 0.8 = 16.0 → Math.round(16/2.5)*2.5 = Math.round(6.4)*2.5 = 6*2.5 = 15
    expect(calculateWorkingWeight(20, 80)).toBe(15);
  });
  it('handles NaN inputs gracefully', () => {
    const result = calculateWorkingWeight(NaN, 80);
    expect(isNaN(result)).toBe(true);
  });
});
