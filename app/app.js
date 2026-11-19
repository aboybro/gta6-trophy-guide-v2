// Bootstrap for Leonida Ledger: loads app/data/trophies.json at run time, wires
// the controls, and renders the guide. Demo states come from the URL (?demo=,
// ?open=<id>, ?filter=<kind>, #roadmap / #counters / #trophy-<id>) and are kept
// in memory only, so a demo link never touches a player's saved progress.
import {
  blankTrackerState, loadTrackerState, saveTrackerState, clampCounterValue,
  downloadTrackerExport, readTrackerImportFile,
} from './state.js';
import {
  renderAuditStrip, renderRoadmap, renderCounters, renderTrophyList,
  renderSources, updateProgressNumbers,
} from './render.js';

// Screenshot/demo states, read from the URL and kept in memory only.
function readDemoState() {
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  const openId = Number(params.get('open'));
  const filter = params.get('filter');
  const demoEarned = {
    cover: [2, 3, 4, 8, 15, 17, 21, 22, 28, 35, 42, 46, 55, 25, 31, 19, 12, 5, 9, 30],
    steps: [2, 3, 4, 8, 15],
    roadmap: [2, 3, 4, 8, 28],
    counters: [2, 3, 15, 17, 35],
  }[demo];
  const demoCounters = {
    cover: { 15: 120, 17: 31, 31: 55, 35: 64, 42: 30 },
    steps: { 15: 187 },
    counters: { 15: 187, 17: 31, 31: 55, 35: 64, 42: 30, 52: 125000, 53: 42000 },
  }[demo];
  return {
    demoName: demo,
    demoEarned: demoEarned ? Object.fromEntries(demoEarned.map((id) => [id, true])) : null,
    demoCounters: demoCounters || null,
    openGuideId: Number.isInteger(openId) && openId > 0 ? openId : (demo === 'cover' ? 1 : null),
    filter: filter && ['story', 'missable', 'collectibles', 'activities', 'online'].includes(filter) ? filter : null,
  };
}

const demo = readDemoState();
let tracker = demo.demoEarned ? { ...blankTrackerState(), earned: demo.demoEarned, counters: demo.demoCounters || {} } : loadTrackerState();
const ui = {
  openGuideId: demo.openGuideId,
  filters: { kind: demo.filter || 'all', grade: 'all', query: '' },
};

let guideData = null;

function renderAll() {
  renderAuditStrip(guideData);
  renderRoadmap(guideData);
  renderCounters(guideData, tracker, onCounterChange, jumpToTrophy);
  renderTrophyList(guideData, tracker, ui, {
    onToggleEarned: (id, checked) => {
      if (checked) tracker.earned[id] = true; else delete tracker.earned[id];
      if (!demo.demoEarned) saveTrackerState(tracker);
      renderAll();
    },
    onToggleGuide: (id) => {
      ui.openGuideId = ui.openGuideId === id ? null : id;
      renderAll();
      if (ui.openGuideId) document.getElementById('trophy-' + id)?.scrollIntoView({ block: 'nearest' });
    },
  });
  renderSources(guideData);
  updateProgressNumbers(guideData, tracker);
}

function onCounterChange(id, value) {
  const trophy = guideData.trophies.find((t) => t.id === id);
  tracker.counters[id] = clampCounterValue(value, trophy.counter.target);
  if (!demo.demoEarned) saveTrackerState(tracker);
  renderAll();
}

function jumpToTrophy(id) {
  ui.filters.kind = 'all';
  ui.filters.grade = 'all';
  ui.filters.query = '';
  document.getElementById('search').value = '';
  ui.openGuideId = id;
  renderAll();
  document.getElementById('trophy-' + id)?.scrollIntoView({ block: 'center' });
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
    for (const b of document.querySelectorAll('#kindFilters button')) b.classList.toggle('active', b === button);
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
    if (!demo.demoEarned) saveTrackerState(tracker);
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => downloadTrackerExport(tracker));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      tracker = await readTrackerImportFile(file);
      spoiler.checked = tracker.spoiler === true;
      if (!demo.demoEarned) saveTrackerState(tracker);
      renderAll();
    } catch {
      alert('That file is not a Leonida Ledger progress export.');
    }
    event.target.value = '';
  });
}

async function bootLeonidaLedger() {
  const response = await fetch('data/trophies.json');
  guideData = await response.json();
  wireControls();
  if (demo.filter) {
    ui.filters.kind = demo.filter;
    for (const b of document.querySelectorAll('#kindFilters button')) b.classList.toggle('active', b.dataset.kind === demo.filter);
  }
  renderAll();
  // A demo that opens a guide scrolls that trophy into view, so the
  // screenshot shows the cited steps; the cover stays at the top of the page.
  if (ui.openGuideId && demo.demoName !== 'cover') {
    document.getElementById('trophy-' + ui.openGuideId)?.scrollIntoView({ block: 'center' });
  }
  // Scroll a hash target into view after the list renders, so screenshot
  // states (#roadmap, #counters, #trophy-<id>) are deterministic.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView();
  }
}

bootLeonidaLedger();
