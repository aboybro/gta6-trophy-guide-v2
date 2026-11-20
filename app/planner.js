// Next Up planner for Leonida Ledger: from the saved tracker state, pick
// the five trophies the player can earn soonest, in the order the roadmap
// says to do them. The missable trophy always comes first while it is still
// open; after it come the earliest un-earned story trophies, then the
// counters the player has already started, then the rest by stage.
export function planNextTrophies(data, state) {
  const earned = state.earned || {};
  const open = data.trophies.filter((trophy) => !earned[trophy.id]);
  const byId = (id) => data.trophies.find((t) => t.id === id);
  const missable = open.filter((trophy) => trophy.missable);
  const story = open.filter((trophy) => !trophy.missable && trophy.kinds.includes('story'));
  const started = open.filter((trophy) => {
    if (!trophy.counter || trophy.missable || trophy.kinds.includes('story')) return false;
    const value = (state.counters || {})[trophy.id] || 0;
    return value > 0 && value < trophy.counter.target;
  });
  const rest = open.filter((trophy) => {
    if (trophy.missable || trophy.kinds.includes('story')) return false;
    if (started.includes(trophy)) return false;
    return true;
  });
  const inStageOrder = (list) => list.slice().sort((a, b) => a.stage - b.stage || a.id - b.id);
  const picked = [];
  for (const trophy of [...missable, ...inStageOrder(story), ...inStageOrder(started), ...inStageOrder(rest)]) {
    if (picked.length >= 5) break;
    if (trophy.grade === 'platinum') continue;
    picked.push(trophy);
  }
  // The Platinum is never "next": it arrives when the other 54 are done.
  return picked.map((trophy) => ({
    trophy,
    why: nextTrophyReason(trophy, state, byId),
  }));
}

// One line of reasoning per planned trophy, so the player sees why it is
// next instead of just a name.
export function nextTrophyReason(trophy, state, byId) {
  if (trophy.missable) return 'Missable — do it before Chapter 1 ends, or it is gone for this playthrough.';
  if (trophy.kinds.includes('story')) return 'Story stage ' + trophy.stage + ' — the next chapter mission in order.';
  if (trophy.counter) {
    const value = (state.counters || {})[trophy.id] || 0;
    if (value > 0) return 'Already started: ' + value + ' of ' + trophy.counter.target + ' — finish what you began.';
    return 'Counter trophy — start it now, it ticks up while you play.';
  }
  return 'Stage ' + trophy.stage + ' — the next open trophy in the roadmap order.';
}

// Hours left on the road to the Platinum, from the per-trophy estimates in
// the data file. The estimates are this guide's own (marked ≈ in the app),
// so the total is shown as a range, never a promise.
export function estimateHoursLeft(data, state) {
  let hours = 0;
  let counted = 0;
  for (const trophy of data.trophies) {
    if (state.earned && state.earned[trophy.id]) continue;
    if (trophy.grade === 'platinum') continue;
    const match = /≈([\d.]+)\s*(min|h)/.exec(trophy.hours || '');
    if (!match) continue;
    const value = parseFloat(match[1]);
    hours += match[2] === 'min' ? value / 60 : value;
    counted += 1;
  }
  return { hours: Math.round(hours), counted };
}

// Earned share per roadmap stage, for the stage progress bars.
export function stageProgress(data, state, stageNumber) {
  const inStage = data.trophies.filter((trophy) => trophy.stage === stageNumber);
  let earned = 0;
  for (const trophy of inStage) if (state.earned && state.earned[trophy.id]) earned += 1;
  return { earned, total: inStage.length };
}

// Earned share per kind, for the kind progress bars in the header.
export function kindProgress(data, state, kind) {
  const inKind = data.trophies.filter((trophy) => trophy.kinds.includes(kind));
  let earned = 0;
  for (const trophy of inKind) if (state.earned && state.earned[trophy.id]) earned += 1;
  return { earned, total: inKind.length };
}
