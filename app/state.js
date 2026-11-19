// Tracker state for Leonida Ledger: which trophies the player has earned,
// where each counter stands, and whether the spoiler setting is on. The
// state lives in localStorage, can be exported to a JSON file and imported
// back, and is never touched by the demo states the screenshots use (those
// live in memory only, in app.js).
export const STORAGE_KEY = 'leonida-ledger-atlas-v2';

// A fresh, empty tracker: nothing earned, every counter at zero.
export function blankTrackerState() {
  return { earned: {}, counters: {}, spoiler: false };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Read the saved tracker back, tolerating a missing, broken or oddly shaped
// stored value by falling back to a blank state for the bad part only.
export function loadTrackerState() {
  let stored = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (!isRecord(stored)) return blankTrackerState();
  return {
    earned: isRecord(stored.earned) ? stored.earned : {},
    counters: isRecord(stored.counters) ? stored.counters : {},
    spoiler: stored.spoiler === true,
  };
}

export function saveTrackerState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full store: the page keeps working, it just forgets.
  }
}

// Keep a counter inside its legal range: a whole number from 0 to its target.
export function clampCounterValue(value, target) {
  const whole = Math.floor(Number(value));
  if (!Number.isFinite(whole)) return 0;
  if (whole < 0) return 0;
  if (whole > target) return target;
  return whole;
}

// Money counters read as dollars ("$125,000"); plain counters read as a number.
export function formatCounterAmount(value, counter) {
  if (counter && counter.money) return '$' + Number(value).toLocaleString('en-US');
  return String(value);
}

// Offer the tracker as a downloadable JSON file the player can keep or share.
export function downloadTrackerExport(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-ledger-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read a progress file back into tracker state. Anything that is not a
// Leonida Ledger export is refused with an error, never half-applied.
export function readTrackerImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read file'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isRecord(parsed)) throw new Error('not an object');
        resolve({
          earned: isRecord(parsed.earned) ? parsed.earned : {},
          counters: isRecord(parsed.counters) ? parsed.counters : {},
          spoiler: parsed.spoiler === true,
        });
      } catch {
        reject(new Error('not a Leonida Ledger progress file'));
      }
    };
    reader.readAsText(file);
  });
}
