import { describe, it, expect } from 'vitest';
import {
  getScoreCategory,
  isLowerBetter,
  parseTimeToSeconds,
  secondsToTimeStr,
  parseAmrap,
  amrapToNumeric,
  getScoreLabel,
  formatScore,
  formatScoreForStorage,
  parseStoredScore,
  compareScores,
  validateScore,
} from '../../src/lib/score-utils.js';

// ---------------------------------------------------------------------------
// getScoreCategory
// ---------------------------------------------------------------------------
describe('getScoreCategory', () => {
  it('returns freeform for null/undefined', () => {
    expect(getScoreCategory(null)).toBe('freeform');
    expect(getScoreCategory(undefined)).toBe('freeform');
    expect(getScoreCategory('')).toBe('freeform');
  });

  it('returns time for For Time, Chipper, Metcon (case-insensitive)', () => {
    expect(getScoreCategory('For Time')).toBe('time');
    expect(getScoreCategory('for time')).toBe('time');
    expect(getScoreCategory('Chipper')).toBe('time');
    expect(getScoreCategory('chipper')).toBe('time');
    expect(getScoreCategory('Metcon')).toBe('time');
    expect(getScoreCategory('metcon')).toBe('time');
  });

  it('returns amrap for AMRAP', () => {
    expect(getScoreCategory('AMRAP')).toBe('amrap');
    expect(getScoreCategory('amrap')).toBe('amrap');
  });

  it('returns weight for Strength', () => {
    expect(getScoreCategory('Strength')).toBe('weight');
    expect(getScoreCategory('strength')).toBe('weight');
  });

  it('returns rounds for EMOM and Rounds', () => {
    expect(getScoreCategory('EMOM')).toBe('rounds');
    expect(getScoreCategory('emom')).toBe('rounds');
    expect(getScoreCategory('Rounds')).toBe('rounds');
    expect(getScoreCategory('rounds')).toBe('rounds');
  });

  it('returns freeform for unknown types', () => {
    expect(getScoreCategory('Custom')).toBe('freeform');
    expect(getScoreCategory('Partner WOD')).toBe('freeform');
  });
});

// ---------------------------------------------------------------------------
// isLowerBetter
// ---------------------------------------------------------------------------
describe('isLowerBetter', () => {
  it('returns true only for time-based types', () => {
    expect(isLowerBetter('For Time')).toBe(true);
    expect(isLowerBetter('Chipper')).toBe(true);
    expect(isLowerBetter('Metcon')).toBe(true);
  });

  it('returns false for non-time types', () => {
    expect(isLowerBetter('AMRAP')).toBe(false);
    expect(isLowerBetter('Strength')).toBe(false);
    expect(isLowerBetter('EMOM')).toBe(false);
    expect(isLowerBetter('Rounds')).toBe(false);
    expect(isLowerBetter(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseTimeToSeconds
// ---------------------------------------------------------------------------
describe('parseTimeToSeconds', () => {
  it('parses MM:SS format', () => {
    expect(parseTimeToSeconds('12:34')).toBe(754);
    expect(parseTimeToSeconds('0:30')).toBe(30);
    expect(parseTimeToSeconds('1:00')).toBe(60);
  });

  it('parses H:MM:SS format', () => {
    expect(parseTimeToSeconds('1:15:00')).toBe(4500);
    expect(parseTimeToSeconds('2:00:00')).toBe(7200);
    expect(parseTimeToSeconds('1:01:01')).toBe(3661);
  });

  it('parses bare numbers as seconds', () => {
    expect(parseTimeToSeconds('45')).toBe(45);
    expect(parseTimeToSeconds('120')).toBe(120);
  });

  it('returns null for invalid input', () => {
    expect(parseTimeToSeconds(null)).toBeNull();
    expect(parseTimeToSeconds('')).toBeNull();
    expect(parseTimeToSeconds('abc')).toBeNull();
    expect(parseTimeToSeconds('12:ab')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseTimeToSeconds(120)).toBeNull();
    expect(parseTimeToSeconds(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// secondsToTimeStr
// ---------------------------------------------------------------------------
describe('secondsToTimeStr', () => {
  it('formats seconds to MM:SS', () => {
    expect(secondsToTimeStr(754)).toBe('12:34');
    expect(secondsToTimeStr(60)).toBe('1:00');
    expect(secondsToTimeStr(30)).toBe('0:30');
    expect(secondsToTimeStr(0)).toBe('0:00');
  });

  it('formats seconds to H:MM:SS when >= 1 hour', () => {
    expect(secondsToTimeStr(4500)).toBe('1:15:00');
    expect(secondsToTimeStr(3661)).toBe('1:01:01');
    expect(secondsToTimeStr(7200)).toBe('2:00:00');
  });

  it('rounds to nearest second', () => {
    expect(secondsToTimeStr(30.6)).toBe('0:31');
  });

  it('returns empty string for invalid input', () => {
    expect(secondsToTimeStr(null)).toBe('');
    expect(secondsToTimeStr(-1)).toBe('');
    expect(secondsToTimeStr(NaN)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseAmrap
// ---------------------------------------------------------------------------
describe('parseAmrap', () => {
  it('parses "8+15" format', () => {
    expect(parseAmrap('8+15')).toEqual({ rounds: 8, reps: 15 });
  });

  it('parses "8 + 15" with spaces', () => {
    expect(parseAmrap('8 + 15')).toEqual({ rounds: 8, reps: 15 });
  });

  it('parses "8 rounds + 15 reps" verbose format', () => {
    expect(parseAmrap('8 rounds + 15 reps')).toEqual({ rounds: 8, reps: 15 });
    expect(parseAmrap('8 round + 15 rep')).toEqual({ rounds: 8, reps: 15 });
  });

  it('parses bare number as rounds with 0 reps', () => {
    expect(parseAmrap('10')).toEqual({ rounds: 10, reps: 0 });
  });

  it('returns null for invalid input', () => {
    expect(parseAmrap(null)).toBeNull();
    expect(parseAmrap('')).toBeNull();
    expect(parseAmrap('abc')).toBeNull();
    expect(parseAmrap('3.5')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// amrapToNumeric
// ---------------------------------------------------------------------------
describe('amrapToNumeric', () => {
  it('converts rounds+reps to rounds*1000+reps', () => {
    expect(amrapToNumeric('8+15')).toBe(8015);
    expect(amrapToNumeric('10+0')).toBe(10000);
    expect(amrapToNumeric('5')).toBe(5000);
  });

  it('returns null for invalid input', () => {
    expect(amrapToNumeric('abc')).toBeNull();
    expect(amrapToNumeric(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getScoreLabel
// ---------------------------------------------------------------------------
describe('getScoreLabel', () => {
  it('returns Time for time-based types', () => {
    expect(getScoreLabel('For Time')).toBe('Time');
    expect(getScoreLabel('Chipper')).toBe('Time');
    expect(getScoreLabel('Metcon')).toBe('Time');
  });

  it('returns Score for AMRAP', () => {
    expect(getScoreLabel('AMRAP')).toBe('Score');
  });

  it('returns Weight for Strength', () => {
    expect(getScoreLabel('Strength')).toBe('Weight');
  });

  it('returns Rounds for EMOM and Rounds', () => {
    expect(getScoreLabel('EMOM')).toBe('Rounds');
    expect(getScoreLabel('Rounds')).toBe('Rounds');
  });

  it('returns Score for freeform/unknown', () => {
    expect(getScoreLabel(null)).toBe('Score');
    expect(getScoreLabel('Custom')).toBe('Score');
  });
});

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------
describe('formatScore', () => {
  it('formats time values as MM:SS display string', () => {
    expect(formatScore('12:34', 'For Time')).toBe('12:34');
    expect(formatScore('1:15:00', 'For Time')).toBe('1:15:00');
  });

  it('formats AMRAP with reps', () => {
    expect(formatScore('8+15', 'AMRAP')).toBe('8 + 15 reps');
  });

  it('formats AMRAP without reps', () => {
    expect(formatScore('10', 'AMRAP')).toBe('10 rounds');
  });

  it('formats weight with kgs suffix', () => {
    expect(formatScore('100', 'Strength')).toBe('100 kgs');
    expect(formatScore('82.5', 'Strength')).toBe('82.5 kgs');
  });

  it('formats rounds with rounds suffix', () => {
    expect(formatScore('8', 'EMOM')).toBe('8 rounds');
  });

  it('returns raw value for freeform', () => {
    expect(formatScore('Some notes', 'Custom')).toBe('Some notes');
  });

  it('returns empty string for falsy value', () => {
    expect(formatScore('', 'For Time')).toBe('');
    expect(formatScore(null, 'AMRAP')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatScoreForStorage
// ---------------------------------------------------------------------------
describe('formatScoreForStorage', () => {
  it('formats time from minutes/seconds to MM:SS string', () => {
    expect(formatScoreForStorage({ minutes: '12', seconds: '34' }, 'For Time')).toBe('12:34');
    expect(formatScoreForStorage({ minutes: '0', seconds: '30' }, 'For Time')).toBe('0:30');
    expect(formatScoreForStorage({ minutes: '1', seconds: '0' }, 'For Time')).toBe('1:00');
  });

  it('returns empty string when time is 0:00', () => {
    expect(formatScoreForStorage({ minutes: '0', seconds: '0' }, 'For Time')).toBe('');
    expect(formatScoreForStorage({ minutes: '', seconds: '' }, 'For Time')).toBe('');
  });

  it('formats AMRAP rounds+reps', () => {
    expect(formatScoreForStorage({ rounds: '8', reps: '15' }, 'AMRAP')).toBe('8+15');
    expect(formatScoreForStorage({ rounds: '10', reps: '0' }, 'AMRAP')).toBe('10');
    expect(formatScoreForStorage({ rounds: '5', reps: '' }, 'AMRAP')).toBe('5');
  });

  it('returns empty string for AMRAP with invalid rounds', () => {
    expect(formatScoreForStorage({ rounds: '', reps: '' }, 'AMRAP')).toBe('');
  });

  it('formats weight as string', () => {
    expect(formatScoreForStorage({ weight: '100' }, 'Strength')).toBe('100');
    expect(formatScoreForStorage({ weight: 82.5 }, 'Strength')).toBe('82.5');
  });

  it('returns empty string for missing weight', () => {
    expect(formatScoreForStorage({ weight: '' }, 'Strength')).toBe('');
  });

  it('formats rounds as string', () => {
    expect(formatScoreForStorage({ rounds: '8' }, 'EMOM')).toBe('8');
  });

  it('returns empty string for missing rounds', () => {
    expect(formatScoreForStorage({ rounds: '' }, 'EMOM')).toBe('');
  });

  it('returns text for freeform', () => {
    expect(formatScoreForStorage({ text: 'Some notes' }, 'Custom')).toBe('Some notes');
    expect(formatScoreForStorage({}, 'Custom')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseStoredScore
// ---------------------------------------------------------------------------
describe('parseStoredScore', () => {
  it('returns null for empty/falsy value', () => {
    expect(parseStoredScore('', 'For Time')).toBeNull();
    expect(parseStoredScore(null, 'For Time')).toBeNull();
  });

  it('parses time to { minutes, seconds } strings', () => {
    expect(parseStoredScore('12:34', 'For Time')).toEqual({ minutes: '12', seconds: '34' });
    expect(parseStoredScore('0:30', 'For Time')).toEqual({ minutes: '0', seconds: '30' });
  });

  it('parses H:MM:SS time — minutes are total minutes', () => {
    // 1:15:00 = 4500 secs → hours=1, totalMins = 60+15 = 75, secs = 0
    expect(parseStoredScore('1:15:00', 'For Time')).toEqual({ minutes: '75', seconds: '0' });
  });

  it('returns null for unparseable time', () => {
    expect(parseStoredScore('abc', 'For Time')).toBeNull();
  });

  it('parses AMRAP to { rounds, reps } strings', () => {
    expect(parseStoredScore('8+15', 'AMRAP')).toEqual({ rounds: '8', reps: '15' });
    expect(parseStoredScore('10', 'AMRAP')).toEqual({ rounds: '10', reps: '0' });
  });

  it('returns null for unparseable AMRAP', () => {
    expect(parseStoredScore('abc', 'AMRAP')).toBeNull();
  });

  it('parses weight stripping unit suffix', () => {
    expect(parseStoredScore('100 kgs', 'Strength')).toEqual({ weight: '100' });
    expect(parseStoredScore('80 lbs', 'Strength')).toEqual({ weight: '80' });
    expect(parseStoredScore('82.5', 'Strength')).toEqual({ weight: '82.5' });
  });

  it('returns null for unparseable weight', () => {
    expect(parseStoredScore('heavy', 'Strength')).toBeNull();
  });

  it('parses rounds stripping "rounds" suffix', () => {
    expect(parseStoredScore('8 rounds', 'EMOM')).toEqual({ rounds: '8' });
    expect(parseStoredScore('12', 'EMOM')).toEqual({ rounds: '12' });
  });

  it('returns null for unparseable rounds', () => {
    expect(parseStoredScore('many', 'EMOM')).toBeNull();
  });

  it('returns { text: value } for freeform', () => {
    expect(parseStoredScore('Some notes', 'Custom')).toEqual({ text: 'Some notes' });
  });
});

// ---------------------------------------------------------------------------
// compareScores
// ---------------------------------------------------------------------------
describe('compareScores', () => {
  it('time: lower is better (negative = A is better)', () => {
    // A=10:00, B=12:00 → A is better → negative result
    expect(compareScores('10:00', '12:00', 'For Time')).toBeLessThan(0);
    // A=12:00, B=10:00 → B is better → positive result
    expect(compareScores('12:00', '10:00', 'For Time')).toBeGreaterThan(0);
    // equal
    expect(compareScores('10:00', '10:00', 'For Time')).toBe(0);
  });

  it('time: unparseable scores treated as worst (Infinity)', () => {
    expect(compareScores('abc', '10:00', 'For Time')).toBeGreaterThan(0);
    expect(compareScores('10:00', 'abc', 'For Time')).toBeLessThan(0);
  });

  it('AMRAP: higher is better (negative = A is better)', () => {
    // A=10+5 > B=8+15 → A is better → negative
    expect(compareScores('10+5', '8+15', 'AMRAP')).toBeLessThan(0);
    expect(compareScores('8+15', '10+5', 'AMRAP')).toBeGreaterThan(0);
    expect(compareScores('8+15', '8+15', 'AMRAP')).toBe(0);
  });

  it('AMRAP: unparseable treated as worst (-Infinity)', () => {
    expect(compareScores('abc', '8+15', 'AMRAP')).toBeGreaterThan(0);
  });

  it('weight: higher is better', () => {
    expect(compareScores('120', '100', 'Strength')).toBeLessThan(0);
    expect(compareScores('100', '120', 'Strength')).toBeGreaterThan(0);
    expect(compareScores('100', '100', 'Strength')).toBe(0);
  });

  it('rounds: higher is better', () => {
    expect(compareScores('12', '8', 'EMOM')).toBeLessThan(0);
    expect(compareScores('8', '12', 'EMOM')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// validateScore
// ---------------------------------------------------------------------------
describe('validateScore', () => {
  it('validates time: accepts valid minutes/seconds', () => {
    expect(validateScore({ minutes: '12', seconds: '34' }, 'For Time')).toEqual({ valid: true, error: null });
    expect(validateScore({ minutes: '0', seconds: '30' }, 'For Time')).toEqual({ valid: true, error: null });
  });

  it('validates time: rejects seconds > 59', () => {
    const result = validateScore({ minutes: '1', seconds: '60' }, 'For Time');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Seconds must be 0-59');
  });

  it('validates time: rejects fully missing time', () => {
    const result = validateScore({ minutes: '', seconds: '' }, 'For Time');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Enter a valid time');
  });

  it('validates AMRAP: accepts valid rounds', () => {
    expect(validateScore({ rounds: '8', reps: '15' }, 'AMRAP')).toEqual({ valid: true, error: null });
    expect(validateScore({ rounds: '0', reps: '0' }, 'AMRAP')).toEqual({ valid: true, error: null });
  });

  it('validates AMRAP: rejects missing rounds', () => {
    const result = validateScore({ rounds: '', reps: '0' }, 'AMRAP');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Enter rounds completed');
  });

  it('validates AMRAP: rejects negative reps', () => {
    const result = validateScore({ rounds: '5', reps: '-1' }, 'AMRAP');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Reps cannot be negative');
  });

  it('validates weight: accepts valid weight', () => {
    expect(validateScore({ weight: '100' }, 'Strength')).toEqual({ valid: true, error: null });
    expect(validateScore({ weight: '0' }, 'Strength')).toEqual({ valid: true, error: null });
  });

  it('validates weight: rejects missing or negative weight', () => {
    expect(validateScore({ weight: '' }, 'Strength').valid).toBe(false);
    expect(validateScore({ weight: '-5' }, 'Strength').valid).toBe(false);
  });

  it('validates rounds: accepts valid rounds', () => {
    expect(validateScore({ rounds: '10' }, 'EMOM')).toEqual({ valid: true, error: null });
  });

  it('validates rounds: rejects missing or negative rounds', () => {
    expect(validateScore({ rounds: '' }, 'EMOM').valid).toBe(false);
    expect(validateScore({ rounds: '-1' }, 'EMOM').valid).toBe(false);
  });

  it('freeform always valid', () => {
    expect(validateScore({ text: '' }, 'Custom')).toEqual({ valid: true, error: null });
    expect(validateScore({}, null)).toEqual({ valid: true, error: null });
  });
});
