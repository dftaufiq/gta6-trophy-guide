// Boot for the GTA VI trophy guide. The tracker core (trophies + sources) loads
// first; the roadmap, disputes and the other views load later by import() so
// the first load stays small. All data is local JSON — the app works offline
// and makes zero network requests at runtime.
import { loadState, saveState, exportJSON, importJSON, importLegacyArray, setSpoilerHidden } from './src/store.js';
import { computeAudit, perSourceCounts, perSourceGuides, renderAuditBar } from './src/audit.js';
import { createTracker } from './src/tracker.js';

const state = loadState();
let trophies = [];
let sourcesMeta = null;
let sourcesById = new Map();
let roadmap = null;
let disputes = null;
let checklist = null;
let tracker = null;
const loadedViews = new Set();

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

function renderProgress() {
  const earned = trophies.filter((t) => state.earned[t.id]);
  const pct = trophies.length ? Math.round((earned.length / trophies.length) * 100) : 0;
  document.getElementById('progressText').textContent = `${earned.length} / ${trophies.length} earned · ${pct}%`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  const per = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) totals[t.grade]++;
  for (const t of earned) per[t.grade]++;
  // PSN points: platinum 300, gold 90, silver 30, bronze 15 — 1,350 for the
  // full list (sixshore, via PSNProfiles/TrueTrophies).
  const points = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
  const earnedPts = earned.reduce((sum, t) => sum + points[t.grade], 0);
  const totalPts = trophies.reduce((sum, t) => sum + points[t.grade], 0);
  document.getElementById('gradeCounts').textContent =
    `PSN ${earnedPts.toLocaleString()}/${totalPts.toLocaleString()} pts · P ${per.platinum}/${totals.platinum} · G ${per.gold}/${totals.gold} · S ${per.silver}/${totals.silver} · B ${per.bronze}/${totals.bronze}`;
}

function renderAudit() {
  const audit = computeAudit(trophies, roadmap, sourcesMeta, disputes, checklist);
  renderAuditBar(document.getElementById('auditBar'), audit);
  if (roadmap && disputes && checklist) document.body.dataset.auditReady = 'true';
}

function refreshAll() {
  renderProgress();
  tracker.refresh();
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  if (name === 'roadmap') openRoadmap();
  if (name === 'checklist') openChecklist();
  if (name === 'missables') openMissables();
  if (name === 'sources') openSources();
  if (name === 'disputes') openDisputes();
}

async function openRoadmap() {
  if (!roadmap) roadmap = await fetchJSON('data/roadmap.json');
  const { renderRoadmap } = await import('./src/roadmap.js');
  renderRoadmap(document.getElementById('roadmapBody'), roadmap, trophies, state, selectTrophy);
  loadedViews.add('roadmap');
  renderAudit();
}

async function openChecklist() {
  if (!checklist) checklist = await fetchJSON('data/checklist.json');
  const { renderChecklist } = await import('./src/checklist.js');
  renderChecklist(document.getElementById('checklistBody'), checklist, new Map(trophies.map((t) => [t.id, t])), state, selectTrophy);
  loadedViews.add('checklist');
  renderAudit();
}

async function openMissables() {
  if (!roadmap) roadmap = await fetchJSON('data/roadmap.json');
  const { renderMissables } = await import('./src/missables.js');
  renderMissables(document.getElementById('missablesBody'), trophies, state, roadmap, selectTrophy);
  loadedViews.add('missables');
  renderAudit();
}

async function openSources() {
  if (!roadmap) roadmap = await fetchJSON('data/roadmap.json');
  if (!checklist) checklist = await fetchJSON('data/checklist.json');
  const counts = perSourceCounts(trophies, roadmap, checklist, sourcesMeta.sources.map((s) => s.id));
  const guides = perSourceGuides(trophies, sourcesMeta.sources.map((s) => s.id));
  const { renderSources } = await import('./src/sources.js');
  renderSources(document.getElementById('sourcesBody'), sourcesMeta, counts, guides);
  loadedViews.add('sources');
  renderAudit();
}

async function openDisputes() {
  if (!disputes) {
    disputes = (await fetchJSON('data/disputes.json')).disputes;
    tracker.setDisputes(disputes);
  }
  const { renderDisputes } = await import('./src/disputes.js');
  renderDisputes(document.getElementById('disputesBody'), disputes, new Map(trophies.map((t) => [t.id, t])), selectTrophy);
  loadedViews.add('disputes');
  renderAudit();
}

function selectTrophy(id) {
  switchView('tracker');
  tracker.select(id);
  document.getElementById('view-tracker').scrollIntoView({ block: 'start' });
}

function wireChrome() {
  document.querySelectorAll('.tab').forEach((b) => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });
  document.getElementById('searchBox').addEventListener('input', (e) => {
    tracker.setFilter('query', e.target.value.trim());
  });
  for (const [rowId, key] of [['kindChips', 'kind'], ['gradeChips', 'grade'], ['stateChips', 'state']]) {
    document.getElementById(rowId).addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      document.getElementById(rowId).querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      tracker.setFilter(key, btn.dataset[key]);
    });
  }
  const spoiler = document.getElementById('spoilerToggle');
  spoiler.checked = state.spoilerHidden;
  spoiler.addEventListener('change', () => {
    setSpoilerHidden(state, spoiler.checked);
    refreshAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportJSON(state)], { type: 'application/json' }));
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const importFile = document.getElementById('importFile');
  document.getElementById('importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let next;
      try {
        next = importJSON(text);
      } catch (err) {
        if (err.message === 'LEGACY_ARRAY') next = importLegacyArray(JSON.parse(text), trophies);
        else throw err;
      }
      Object.assign(state, next);
      saveState(state);
      spoiler.checked = state.spoilerHidden;
      refreshAll();
    } catch {
      alert('That file is not a trophy progress export.');
    }
    importFile.value = '';
  });
  // Citation links jump to the Sources tab and scroll to the cited source.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-src]');
    if (!link) return;
    e.preventDefault();
    const id = link.dataset.src;
    switchView('sources');
    setTimeout(() => {
      const target = document.getElementById(`src-${id}`);
      if (target) target.scrollIntoView({ block: 'center' });
    }, 60);
  });
}

async function init() {
  const [trophyDoc, srcDoc] = await Promise.all([
    fetchJSON('data/trophies.json'),
    fetchJSON('data/sources.json'),
  ]);
  trophies = trophyDoc.trophies;
  sourcesMeta = srcDoc;
  sourcesById = new Map(srcDoc.sources.map((s) => [s.id, s]));
  tracker = createTracker({ trophies, sourcesById, state, onChange: refreshAll });
  wireChrome();
  renderProgress();
  renderAudit();
  tracker.refresh();
  tracker.select(1);
  // Background data for the full audit numbers and the dispute panels. This
  // runs after the first paint so the tracker is usable immediately.
  Promise.all([
    fetchJSON('data/roadmap.json').then((d) => { roadmap = d; }),
    fetchJSON('data/disputes.json').then((d) => { disputes = d.disputes; tracker.setDisputes(disputes); }),
    fetchJSON('data/checklist.json').then((d) => { checklist = d; }),
  ]).then(renderAudit).catch(() => { /* offline or partial: tracker still works */ });
}

init().catch((err) => {
  document.getElementById('auditBar').innerHTML = `<span>Could not load the guide data. Open this page from the app folder (for example with <b>node serve.ts</b>) so the data files can load. (${err.message})</span>`;
});
