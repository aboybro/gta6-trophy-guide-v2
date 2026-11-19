// Tracker state for Leonida Ledger: what the player earned, what each counter
// reads, and the spoiler setting. Saved in localStorage, exportable to a JSON
// file and importable back. Demo states (URL params) never touch this store.
export const STORAGE_KEY = 'leonida-ledger-atlas-v2';

export function blankTrackerState() {
  return { earned: {}, counters: {}, spoiler: false };
}

export function loadTrackerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankTrackerState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankTrackerState();
    return {
      earned: parsed.earned && typeof parsed.earned === 'object' ? parsed.earned : {},
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return blankTrackerState();
  }
}

export function saveTrackerState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full store: the page still works, it just forgets.
  }
}

export function clampCounterValue(value, target) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(target, n));
}

export function formatCounterAmount(value, counter) {
  if (counter && counter.money) return '$' + Number(value).toLocaleString('en-US');
  return String(value);
}

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

export function readTrackerImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read file'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
        resolve({
          earned: parsed.earned && typeof parsed.earned === 'object' ? parsed.earned : {},
          counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
          spoiler: parsed.spoiler === true,
        });
      } catch {
        reject(new Error('not a Leonida Ledger progress file'));
      }
    };
    reader.readAsText(file);
  });
}
