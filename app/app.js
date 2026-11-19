// Bootstrap for Leonida Ledger: fetches app/data/trophies.json at run time,
// wires the controls, and renders the guide. Demo states come from the URL
// (?demo=, ?open=<id>, ?filter=<kind>, #roadmap / #counters / #trophy-<id>)
// and live in memory only, so a demo link never touches a player's saved
// progress. After the first render it sets window.__shotReady, which the
// screenshot run waits for.
import {
  blankTrackerState, loadTrackerState, saveTrackerState, clampCounterValue,
  downloadTrackerExport, readTrackerImportFile,
} from './state.js';
import {
  renderAuditStrip, renderRoadmap, renderCounters, renderTrophyList,
  renderSources, updateProgressNumbers,
} from './render.js';

const KIND_FILTERS = ['story', 'missable', 'collectibles', 'activities', 'online'];

// Demo presets: which trophies count as earned and where the counters stand
// for each screenshot state. Nothing here is saved anywhere.
const DEMO_EARNED = {
  cover: [2, 3, 4, 8, 15, 17, 21, 22, 28, 35, 42, 46, 55, 25, 31, 19, 12, 5, 9, 30],
  steps: [2, 3, 4, 8, 15],
  roadmap: [2, 3, 4, 8, 28],
  counters: [2, 3, 15, 17, 35],
};
const DEMO_COUNTERS = {
  cover: { 15: 120, 17: 31, 31: 55, 35: 64, 42: 30 },
  steps: { 15: 187 },
  counters: { 15: 187, 17: 31, 31: 55, 35: 64, 42: 30, 52: 125000, 53: 42000 },
};

function readDemoState() {
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  const openId = Number(params.get('open'));
  const filter = params.get('filter');
  const earnedIds = DEMO_EARNED[demo];
  return {
    demoName: demo,
    demoEarned: earnedIds ? Object.fromEntries(earnedIds.map((id) => [id, true])) : null,
    demoCounters: DEMO_COUNTERS[demo] || null,
    openGuideId: Number.isInteger(openId) && openId > 0 ? openId : (demo === 'cover' ? 1 : null),
    filter: filter && KIND_FILTERS.includes(filter) ? filter : null,
  };
}

const demo = readDemoState();
// A demo replaces the saved tracker wholesale (in memory only); a normal
// visit loads whatever the player saved in this browser.
let tracker = demo.demoEarned
  ? { ...blankTrackerState(), earned: demo.demoEarned, counters: demo.demoCounters || {} }
  : loadTrackerState();
const ui = {
  openGuideId: demo.openGuideId,
  filters: { kind: demo.filter || 'all', grade: 'all', query: '' },
};

let guideData = null;

function persistTracker() {
  if (!demo.demoEarned) saveTrackerState(tracker);
}

function renderAll() {
  renderAuditStrip(guideData);
  renderRoadmap(guideData);
  renderCounters(guideData, tracker, onCounterChange, jumpToTrophy);
  renderTrophyList(guideData, tracker, ui, {
    onToggleEarned: (id, checked) => {
      if (checked) tracker.earned[id] = true; else delete tracker.earned[id];
      persistTracker();
      renderAll();
    },
    onToggleGuide: (id) => {
      ui.openGuideId = ui.openGuideId === id ? null : id;
      renderAll();
      if (ui.openGuideId) document.getElementById('trophy-' + id)?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    },
  });
  renderSources(guideData);
  updateProgressNumbers(guideData, tracker);
}

function onCounterChange(id, value) {
  const trophy = guideData.trophies.find((t) => t.id === id);
  tracker.counters[id] = clampCounterValue(value, trophy.counter.target);
  persistTracker();
  renderAll();
}

function jumpToTrophy(id) {
  ui.filters.kind = 'all';
  ui.filters.grade = 'all';
  ui.filters.query = '';
  document.getElementById('search').value = '';
  ui.openGuideId = id;
  renderAll();
  document.getElementById('trophy-' + id)?.scrollIntoView({ behavior: 'instant', block: 'center' });
}

function wireControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    ui.filters.query = event.target.value.trim();
    renderAll();
  });
  document.getElementById('kindFilters').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-kind]');
    if (!button) return;
    ui.filters.kind = button.dataset.kind;
    for (const b of document.querySelectorAll('#kindFilters button')) {
      b.classList.toggle('active', b === button);
    }
    renderAll();
  });
  document.getElementById('gradeFilter').addEventListener('change', (event) => {
    ui.filters.grade = event.target.value;
    renderAll();
  });
  const spoiler = document.getElementById('spoilerToggle');
  spoiler.checked = tracker.spoiler === true;
  spoiler.addEventListener('change', () => {
    tracker.spoiler = spoiler.checked;
    persistTracker();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => downloadTrackerExport(tracker));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      tracker = await readTrackerImportFile(file);
      spoiler.checked = tracker.spoiler === true;
      persistTracker();
      renderAll();
    } catch {
      alert('That file is not a Leonida Ledger progress export.');
    }
    event.target.value = '';
  });
}

function markActiveKindButton() {
  for (const b of document.querySelectorAll('#kindFilters button')) {
    b.classList.toggle('active', b.dataset.kind === ui.filters.kind);
  }
}

async function bootLeonidaLedger() {
  const response = await fetch('data/trophies.json');
  guideData = await response.json();
  wireControls();
  if (demo.filter) {
    ui.filters.kind = demo.filter;
    markActiveKindButton();
  }
  renderAll();
  // A demo that opens a guide scrolls that trophy into view, so the
  // screenshot shows the cited steps; the cover stays at the top of the page.
  // Instant scrolling, so a screenshot taken right after the first render
  // always lands on the same view.
  if (ui.openGuideId && demo.demoName !== 'cover') {
    document.getElementById('trophy-' + ui.openGuideId)?.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
  // Scroll a hash target into view after the list renders, so screenshot
  // states (#roadmap, #counters, #trophy-<id>) are deterministic.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView({ behavior: 'instant' });
  }
  window.__shotReady = true;
}

bootLeonidaLedger();
