// Score utilities for CrossFit workout scoring
// Handles parsing, formatting, comparison, and validation for different WOD types.
// The results.time column remains TEXT — these utilities normalize how values
// are entered, stored, displayed, and compared.

/**
 * Maps a WOD type string to a score category.
 * @param {string} wodType - e.g. "For Time", "AMRAP", "Strength", "EMOM"
 * @returns {'time'|'amrap'|'rounds'|'weight'|'freeform'}
 */
export const getScoreCategory = (wodType) => {
  if (!wodType) return 'freeform';
  const t = wodType.toLowerCase().trim();
  if (t === 'for time' || t === 'chipper' || t === 'metcon') return 'time';
  if (t === 'amrap') return 'amrap';
  if (t === 'strength') return 'weight';
  if (t === 'emom' || t === 'rounds') return 'rounds';
  return 'freeform';
};

/**
 * Whether lower scores are better for this WOD type.
 */
export const isLowerBetter = (wodType) => {
  return getScoreCategory(wodType) === 'time';
};

/**
 * Parses a time string to total seconds.
 * Handles "MM:SS", "H:MM:SS", or bare numbers.
 * @returns {number|null}
 */
export const parseTimeToSeconds = (str) => {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
};

/**
 * Converts total seconds to a display string.
 * @returns {string} e.g. "12:34" or "1:15:00"
 */
export const secondsToTimeStr = (secs) => {
  if (secs == null || isNaN(secs) || secs < 0) return '';
  const totalSecs = Math.round(secs);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${mins}:${String(s).padStart(2, '0')}`;
};

/**
 * Parses an AMRAP score string into { rounds, reps }.
 * Handles "8+15", "8 + 15", "8 rounds + 15 reps", or bare number (rounds only).
 * @returns {{ rounds: number, reps: number }|null}
 */
export const parseAmrap = (str) => {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Match patterns like "8+15", "8 + 15", "8 rounds + 15 reps"
  const match = trimmed.match(/^(\d+)\s*(?:rounds?)?\s*\+\s*(\d+)\s*(?:reps?)?$/i);
  if (match) {
    return { rounds: parseInt(match[1], 10), reps: parseInt(match[2], 10) };
  }

  // Bare number = rounds only
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && String(num) === trimmed) {
    return { rounds: num, reps: 0 };
  }

  return null;
};

/**
 * Converts an AMRAP string to a numeric value for sorting.
 * rounds * 1000 + reps
 */
export const amrapToNumeric = (str) => {
  const parsed = parseAmrap(str);
  if (!parsed) return null;
  return parsed.rounds * 1000 + parsed.reps;
};

/**
 * Returns the appropriate label for the score field based on WOD type.
 */
export const getScoreLabel = (wodType) => {
  const cat = getScoreCategory(wodType);
  switch (cat) {
    case 'time': return 'Time';
    case 'amrap': return 'Score';
    case 'weight': return 'Weight';
    case 'rounds': return 'Rounds';
    default: return 'Score';
  }
};

/**
 * Formats a stored score value for display.
 * Returns the raw value unchanged if it can't be parsed for the given type.
 */
export const formatScore = (value, wodType) => {
  if (!value) return '';
  const cat = getScoreCategory(wodType);

  switch (cat) {
    case 'time': {
      // Already in MM:SS or H:MM:SS format — return as-is
      const secs = parseTimeToSeconds(value);
      if (secs != null) return secondsToTimeStr(secs);
      return value;
    }
    case 'amrap': {
      const parsed = parseAmrap(value);
      if (parsed) {
        return parsed.reps > 0
          ? `${parsed.rounds} + ${parsed.reps} reps`
          : `${parsed.rounds} rounds`;
      }
      return value;
    }
    case 'weight': {
      const num = parseFloat(value);
      if (!isNaN(num)) return `${value} lbs`;
      return value;
    }
    case 'rounds': {
      const num = parseInt(value, 10);
      if (!isNaN(num) && String(num) === value.trim()) return `${value} rounds`;
      return value;
    }
    default:
      return value;
  }
};

/**
 * Normalizes input field values into the TEXT string stored in the database.
 * @param {object} inputValues - depends on category:
 *   time: { minutes, seconds }
 *   amrap: { rounds, reps }
 *   weight: { weight }
 *   rounds: { rounds }
 *   freeform: { text }
 * @param {string} wodType
 * @returns {string}
 */
export const formatScoreForStorage = (inputValues, wodType) => {
  const cat = getScoreCategory(wodType);

  switch (cat) {
    case 'time': {
      const mins = parseInt(inputValues.minutes, 10) || 0;
      const secs = parseInt(inputValues.seconds, 10) || 0;
      if (mins === 0 && secs === 0) return '';
      const totalSecs = mins * 60 + secs;
      return secondsToTimeStr(totalSecs);
    }
    case 'amrap': {
      const rounds = parseInt(inputValues.rounds, 10);
      const reps = parseInt(inputValues.reps, 10) || 0;
      if (isNaN(rounds)) return '';
      return reps > 0 ? `${rounds}+${reps}` : `${rounds}`;
    }
    case 'weight': {
      const w = inputValues.weight;
      if (!w && w !== 0) return '';
      return String(w);
    }
    case 'rounds': {
      const r = inputValues.rounds;
      if (!r && r !== 0) return '';
      return String(r);
    }
    default:
      return inputValues.text || '';
  }
};

/**
 * Parses a stored score string back into structured input values
 * for pre-populating the ScoreInput component.
 * Returns null if the value can't be parsed for the given category
 * (caller should fall back to freeform).
 */
export const parseStoredScore = (value, wodType) => {
  if (!value) return null;
  const cat = getScoreCategory(wodType);

  switch (cat) {
    case 'time': {
      const secs = parseTimeToSeconds(value);
      if (secs == null) return null;
      const hours = Math.floor(secs / 3600);
      const totalMins = hours * 60 + Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return { minutes: String(totalMins), seconds: String(s) };
    }
    case 'amrap': {
      const parsed = parseAmrap(value);
      if (!parsed) return null;
      return { rounds: String(parsed.rounds), reps: String(parsed.reps) };
    }
    case 'weight': {
      // Strip "lbs" suffix if present
      const cleaned = value.replace(/\s*lbs?\s*$/i, '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return null;
      return { weight: cleaned };
    }
    case 'rounds': {
      const cleaned = value.replace(/\s*rounds?\s*$/i, '').trim();
      const num = parseInt(cleaned, 10);
      if (isNaN(num)) return null;
      return { rounds: cleaned };
    }
    default:
      return { text: value };
  }
};

/**
 * Compares two score values. Returns negative if A is better than B.
 * For "For Time": lower is better. For everything else: higher is better.
 * Unparseable values are treated as worst-possible.
 */
export const compareScores = (a, b, wodType) => {
  const cat = getScoreCategory(wodType);

  if (cat === 'time') {
    const secsA = parseTimeToSeconds(a);
    const secsB = parseTimeToSeconds(b);
    const valA = secsA != null ? secsA : Infinity;
    const valB = secsB != null ? secsB : Infinity;
    return valA - valB; // lower is better
  }

  if (cat === 'amrap') {
    const numA = amrapToNumeric(a) ?? -Infinity;
    const numB = amrapToNumeric(b) ?? -Infinity;
    return numB - numA; // higher is better → negative when A > B
  }

  // weight, rounds, freeform-with-numbers
  const numA = parseFloat(a) || -Infinity;
  const numB = parseFloat(b) || -Infinity;
  return numB - numA; // higher is better
};

/**
 * Validates score input values before submission.
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateScore = (inputValues, wodType) => {
  const cat = getScoreCategory(wodType);

  switch (cat) {
    case 'time': {
      const mins = parseInt(inputValues.minutes, 10);
      const secs = parseInt(inputValues.seconds, 10);
      if ((isNaN(mins) || mins < 0) && (isNaN(secs) || secs < 0)) {
        return { valid: false, error: 'Enter a valid time' };
      }
      if (!isNaN(secs) && secs > 59) {
        return { valid: false, error: 'Seconds must be 0-59' };
      }
      return { valid: true, error: null };
    }
    case 'amrap': {
      const rounds = parseInt(inputValues.rounds, 10);
      if (isNaN(rounds) || rounds < 0) {
        return { valid: false, error: 'Enter rounds completed' };
      }
      const reps = parseInt(inputValues.reps, 10);
      if (!isNaN(reps) && reps < 0) {
        return { valid: false, error: 'Reps cannot be negative' };
      }
      return { valid: true, error: null };
    }
    case 'weight': {
      const w = parseFloat(inputValues.weight);
      if (isNaN(w) || w < 0) {
        return { valid: false, error: 'Enter a valid weight' };
      }
      return { valid: true, error: null };
    }
    case 'rounds': {
      const r = parseInt(inputValues.rounds, 10);
      if (isNaN(r) || r < 0) {
        return { valid: false, error: 'Enter rounds completed' };
      }
      return { valid: true, error: null };
    }
    default:
      return { valid: true, error: null };
  }
};
