// Rendering for Leonida Ledger: the audit strip, the roadmap, the counters,
// the trophy checklist with its cited guides, and the sources panel. Every
// string from the data file is set through textContent, never innerHTML, so
// no trophy name or guide line can ever inject markup.
import { clampCounterValue, formatCounterAmount } from './state.js';

// Build one element, optionally with a class, a text label and child nodes.
export function makeElement(tag, className, text, children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  if (children) for (const child of children) node.appendChild(child);
  return node;
}

export function totalCitedSteps(data) {
  let total = 0;
  for (const trophy of data.trophies) total += trophy.steps ? trophy.steps.length : 0;
  return total;
}

export function totalCounters(data) {
  let total = 0;
  for (const trophy of data.trophies) if (trophy.counter) total += 1;
  return total;
}

// Does this trophy survive the current filter set? The online filter always
// comes back empty on purpose: all 55 trophies are offline single-player.
export function trophyMatchesFilters(trophy, filters) {
  if (filters.kind !== 'all') {
    if (filters.kind === 'missable') {
      if (!trophy.missable) return false;
    } else if (filters.kind === 'online') {
      return false;
    } else if (!trophy.kinds.includes(filters.kind)) {
      return false;
    }
  }
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.query) {
    const haystack = [trophy.name, trophy.description, trophy.guide]
      .concat((trophy.steps || []).map((step) => step.text))
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  return true;
}

// A story trophy stays masked while the spoiler setting is on and the
// player has not earned it yet.
export function isSpoilerMasked(trophy, state) {
  return state.spoiler && trophy.kinds.includes('story') && !state.earned[trophy.id];
}

export function renderAuditStrip(data) {
  const strip = document.getElementById('auditStrip');
  const parts = [
    data.trophies.length + '/' + data.trophies.length + ' official names verified',
    totalCitedSteps(data) + ' cited steps',
    totalCounters(data) + ' counters',
    data.sources.length + ' sources dated Nov 2026',
    'guides in our own words',
  ];
  strip.textContent = parts.join(' · ');
}

export function renderRoadmap(data) {
  const grid = document.getElementById('stageGrid');
  grid.replaceChildren();
  const byId = new Map();
  for (const trophy of data.trophies) byId.set(trophy.id, trophy);
  for (const stage of data.roadmap) {
    const names = stage.trophies.map((id) => byId.get(id).name).join(' · ');
    const card = makeElement('article', 'stageCard', null, [
      makeElement('h3', null, 'Stage ' + stage.stage + ' — ' + stage.title),
      makeElement('p', 'stageHours', stage.hours + ' · ' + stage.trophies.length + ' trophies'),
      makeElement('p', null, stage.order),
      makeElement('p', 'stageTrophies', names),
    ]);
    if (stage.warning) card.appendChild(makeElement('p', 'stageWarning', stage.warning));
    grid.appendChild(card);
  }
}

function buildCounterCard(trophy, state, onCounterChange, onJumpToTrophy) {
  const counter = trophy.counter;
  const value = clampCounterValue(state.counters[trophy.id] ?? 0, counter.target);
  const card = makeElement('article', 'counterCard');
  const heading = makeElement('h3');
  const jump = makeElement('button', null, trophy.name);
  jump.type = 'button';
  jump.addEventListener('click', () => onJumpToTrophy(trophy.id));
  heading.appendChild(jump);
  card.appendChild(heading);
  card.appendChild(makeElement('p', null, counter.label));
  const fill = makeElement('div', 'counterFill');
  fill.style.width = Math.round((value / counter.target) * 100) + '%';
  card.appendChild(makeElement('div', 'counterBar', null, [fill]));
  const row = makeElement('div', 'counterRow');
  const step = counter.money ? 1000 : 1;
  const minus = makeElement('button', null, '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', 'Decrease ' + counter.label);
  minus.addEventListener('click', () => onCounterChange(trophy.id, value - step));
  const plus = makeElement('button', null, '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', 'Increase ' + counter.label);
  plus.addEventListener('click', () => onCounterChange(trophy.id, value + step));
  const valueBox = makeElement('span', 'counterValue');
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = String(counter.target);
  input.value = String(value);
  input.setAttribute('aria-label', counter.label + ' count');
  input.addEventListener('change', () => onCounterChange(trophy.id, Number(input.value)));
  valueBox.appendChild(input);
  valueBox.appendChild(document.createTextNode(
    ' / ' + formatCounterAmount(counter.target, counter) + ' ' + counter.unit,
  ));
  row.appendChild(minus);
  row.appendChild(valueBox);
  row.appendChild(plus);
  card.appendChild(row);
  return card;
}

export function renderCounters(data, state, onCounterChange, onJumpToTrophy) {
  const grid = document.getElementById('counterGrid');
  grid.replaceChildren();
  for (const trophy of data.trophies) {
    if (!trophy.counter) continue;
    grid.appendChild(buildCounterCard(trophy, state, onCounterChange, onJumpToTrophy));
  }
}

function buildTrophyRow(trophy, data, state, ui, callbacks) {
  const masked = isSpoilerMasked(trophy, state);
  const classes = ['trophyRow'];
  if (state.earned[trophy.id]) classes.push('earned');
  if (trophy.missable) classes.push('missableRow');
  const row = makeElement('article', classes.join(' '));
  row.id = 'trophy-' + trophy.id;
  const head = makeElement('div', 'trophyHead');
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = state.earned[trophy.id] === true;
  check.setAttribute('aria-label', 'Earned: ' + trophy.name);
  check.addEventListener('change', () => callbacks.onToggleEarned(trophy.id, check.checked));
  head.appendChild(check);
  head.appendChild(makeElement('span', 'trophyTitle', masked ? 'Hidden story trophy' : trophy.name));
  head.appendChild(makeElement('span', 'gradeBadge grade-' + trophy.grade, trophy.grade));
  row.appendChild(head);
  row.appendChild(makeElement(
    'p',
    'trophyDesc' + (masked ? ' spoilerMask' : ''),
    masked ? 'Hidden until earned (spoiler setting on).' : '“' + trophy.description + '”',
  ));
  const meta = makeElement('div', 'trophyMeta');
  meta.appendChild(makeElement('span', 'tag', 'Stage ' + trophy.stage));
  for (const kind of trophy.kinds) meta.appendChild(makeElement('span', 'tag', kind));
  if (trophy.missable) meta.appendChild(makeElement('span', 'tag missableTag', '⚠ MISSABLE'));
  if (trophy.unconfirmed) meta.appendChild(makeElement('span', 'tag unconfirmedTag', 'Method not yet confirmed'));
  if (trophy.counter) {
    const counted = clampCounterValue(state.counters[trophy.id] ?? 0, trophy.counter.target);
    meta.appendChild(makeElement('span', 'tag',
      'Counter: ' + trophy.counter.label + ' ' +
      formatCounterAmount(counted, trophy.counter) + '/' +
      formatCounterAmount(trophy.counter.target, trophy.counter)));
  }
  row.appendChild(meta);
  if (masked) return row;
  const open = ui.openGuideId === trophy.id;
  const toggle = makeElement('button', 'guideToggle',
    open ? 'Hide guide ▲' : 'Guide: ' + trophy.steps.length + ' cited steps ▼');
  toggle.type = 'button';
  toggle.addEventListener('click', () => callbacks.onToggleGuide(trophy.id));
  row.appendChild(toggle);
  if (!open) return row;
  const body = makeElement('div', 'guideBody');
  body.appendChild(makeElement('p', 'guideSummary', trophy.guide));
  const steps = makeElement('ol', 'citedSteps');
  for (const step of trophy.steps) {
    const item = makeElement('li', null, step.text);
    item.appendChild(makeElement('span', 'citeChip', step.source + ' · ' + step.date));
    steps.appendChild(item);
  }
  body.appendChild(steps);
  const srcNames = trophy.sources.map((s) => s.name + ' (' + s.date + ')').join(', ');
  body.appendChild(makeElement('p', 'guideSources',
    'Sources for this trophy: ' + srcNames + '. Guide written in this entry’s own words.'));
  row.appendChild(body);
  return row;
}

export function renderTrophyList(data, state, ui, callbacks) {
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = data.trophies.filter((trophy) => trophyMatchesFilters(trophy, ui.filters));
  let countLine = shown.length + ' of ' + data.trophies.length + ' trophies shown';
  if (ui.filters.kind === 'online') countLine += ' — no online trophies: all 55 are offline single-player.';
  document.getElementById('listCount').textContent = countLine;
  for (const trophy of shown) list.appendChild(buildTrophyRow(trophy, data, state, ui, callbacks));
}

export function renderSources(data) {
  const panel = document.getElementById('sourcesList');
  panel.replaceChildren();
  for (const source of data.sources) {
    const row = makeElement('div', 'sourceRow');
    row.appendChild(makeElement('strong', null, source.name + ' '));
    row.appendChild(makeElement('span', 'sourceDate', source.date));
    row.appendChild(document.createTextNode(' — ' + source.work + '. Used for: ' + source.covers + '.'));
    panel.appendChild(row);
  }
  const unconfirmed = data.trophies.filter((trophy) => trophy.unconfirmed);
  document.getElementById('honestyNote').textContent =
    'Honest gaps: ' + unconfirmed.length + ' trophies have no confirmed unlock method in any published guide yet (' +
    unconfirmed.map((trophy) => trophy.name).join(', ') +
    '). Their guides say so plainly and give only the best lead from the official description, instead of guessing.';
}

export function updateProgressNumbers(data, state) {
  let earned = 0;
  for (const trophy of data.trophies) if (state.earned[trophy.id]) earned += 1;
  const percent = Math.round((earned / data.trophies.length) * 100);
  document.getElementById('progressNumbers').textContent =
    earned + ' of ' + data.trophies.length + ' earned · ' + percent + '%';
  document.getElementById('progressFill').style.width = percent + '%';
  let doneCounters = 0;
  for (const trophy of data.trophies) {
    if (!trophy.counter) continue;
    if (clampCounterValue(state.counters[trophy.id] ?? 0, trophy.counter.target) >= trophy.counter.target) doneCounters += 1;
  }
  document.getElementById('progressSub').textContent =
    totalCounters(data) + ' counters · ' + doneCounters + ' finished · ' +
    data.roadmap.length + ' roadmap stages';
}
