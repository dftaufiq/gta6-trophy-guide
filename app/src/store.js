// Saved progress for the GTA VI trophy guide: earned ticks, count trackers,
// per-trophy spoiler reveals and the spoiler setting, all in one localStorage key.
const KEY = 'gta6-trophy-guide-v1';

function blankState() {
  return { earned: {}, counts: {}, checklist: {}, revealed: {}, spoilerHidden: true, version: 1 };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankState();
    return {
      earned: parsed.earned && typeof parsed.earned === 'object' ? parsed.earned : {},
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      checklist: parsed.checklist && typeof parsed.checklist === 'object' ? parsed.checklist : {},
      revealed: parsed.revealed && typeof parsed.revealed === 'object' ? parsed.revealed : {},
      spoilerHidden: parsed.spoilerHidden !== false,
      version: 1,
    };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (private mode): progress still works in memory.
  }
}

export function isEarned(state, id) {
  return Boolean(state.earned[id]);
}

export function setEarned(state, id, earned) {
  if (earned) state.earned[id] = true;
  else delete state.earned[id];
  saveState(state);
}

export function getCount(state, id) {
  const n = state.counts[id];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function setCount(state, id, value, max) {
  const n = Math.max(0, Math.min(max, Math.floor(value)));
  if (n === 0) delete state.counts[id];
  else state.counts[id] = n;
  saveState(state);
}

// 100% checklist line counts, stored the same way as trophy counts.
export function getChecklistCount(state, id) {
  const n = state.checklist[id];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function setChecklistCount(state, id, value, max) {
  const n = Math.max(0, Math.min(max, Math.floor(value)));
  if (n === 0) delete state.checklist[id];
  else state.checklist[id] = n;
  saveState(state);
}

export function isRevealed(state, id) {
  return Boolean(state.revealed[id]);
}

export function setRevealed(state, id) {
  state.revealed[id] = true;
  saveState(state);
}

export function setSpoilerHidden(state, hidden) {
  state.spoilerHidden = hidden;
  saveState(state);
}

// Export / import: the file is the same shape as the stored state, so a user can
// back it up, move it to another browser, or share it with a friend.
export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    // The old starter format (a bare array of earned trophy names) is handled
    // by importLegacyArray; signal that with a marker the caller can check.
    throw new Error('LEGACY_ARRAY');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Not a progress file');
  }
  const state = blankState();
  if (parsed.earned && typeof parsed.earned === 'object') state.earned = parsed.earned;
  if (parsed.counts && typeof parsed.counts === 'object') state.counts = parsed.counts;
  if (parsed.checklist && typeof parsed.checklist === 'object') state.checklist = parsed.checklist;
  if (parsed.revealed && typeof parsed.revealed === 'object') state.revealed = parsed.revealed;
  if (typeof parsed.spoilerHidden === 'boolean') state.spoilerHidden = parsed.spoilerHidden;
  return state;
}

export function importLegacyArray(names, trophies) {
  const state = blankState();
  const byName = new Map(trophies.map((t) => [t.name, t.id]));
  for (const name of names) {
    const id = byName.get(name);
    if (id) state.earned[id] = true;
  }
  return state;
}
