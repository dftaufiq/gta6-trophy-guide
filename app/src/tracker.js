// The tracker: trophy list with combinable filters, the per-trophy guide detail,
// the right rail (next up + sources for this guide), count trackers, and the
// spoiler shield that hides story trophies until earned or revealed.
import { isEarned, setEarned, getCount, setCount, isRevealed, setRevealed } from './store.js';

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function isVeiled(t, state) {
  return t.kind === 'story' && state.spoilerHidden && !isEarned(state, t.id) && !isRevealed(state, t.id);
}

export function displayName(t, state) {
  return isVeiled(t, state) ? 'Hidden story trophy' : t.name;
}

export function displayDesc(t, state) {
  return isVeiled(t, state) ? 'Story trophy — hidden until earned or revealed.' : t.description;
}

function citeLinks(sources) {
  return (sources || []).map((n) => `<span class="cite"><a href="#sources" data-src="${n}">[${n}]</a></span>`).join(' ');
}

function gradeBadge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}

function countStep(target) {
  if (target >= 10000) return Math.max(1, Math.round(target / 100));
  if (target >= 100) return 5;
  return 1;
}

export function createTracker(ctx) {
  const { trophies, sourcesById, state, onChange } = ctx;
  let disputesById = new Map();
  let filters = { kind: 'all', grade: 'all', state: 'all', query: '' };
  let selectedId = null;

  // Roadmap order: trophies sorted by roadmap stage, then by id. Shown as #n
  // in the list and the detail pane so the tracker doubles as a play order.
  const roadmapOrder = new Map(
    [...trophies]
      .sort((a, b) => (a.roadmap_stage ?? 9) - (b.roadmap_stage ?? 9) || a.id - b.id)
      .map((t, i) => [t.id, i + 1]),
  );

  const listEl = document.getElementById('trophyList');
  const detailEl = document.getElementById('detailPane');
  const railEl = document.getElementById('railPane');

  // Filter chips carry their counts, computed from the data; earned counts
  // update live as trophies are ticked.
  function setChipCounts() {
    const earnedN = trophies.filter((t) => isEarned(state, t.id)).length;
    const counts = {
      kind: { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 },
      grade: { all: trophies.length, platinum: 0, gold: 0, silver: 0, bronze: 0 },
      state: {
        all: trophies.length,
        earned: earnedN,
        'not-earned': trophies.length - earnedN,
        hidden: trophies.filter((t) => t.hidden).length,
        disputed: trophies.filter((t) => (t.disputed || []).length).length,
        unconfirmed: trophies.filter((t) => t.unconfirmed).length,
      },
    };
    for (const t of trophies) {
      counts.kind[t.kind]++;
      counts.grade[t.grade]++;
    }
    const labels = {
      kind: { all: 'All', story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' },
      grade: { all: 'All grades', platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' },
      state: { all: 'All states', earned: 'Earned', 'not-earned': 'Not earned', hidden: 'PSN-hidden', disputed: 'Disputed', unconfirmed: 'Unconfirmed' },
    };
    for (const [rowId, key] of [['kindChips', 'kind'], ['gradeChips', 'grade'], ['stateChips', 'state']]) {
      document.getElementById(rowId).querySelectorAll('.chip').forEach((chip) => {
        const v = chip.dataset[key];
        const n = counts[key][v];
        chip.textContent = key === 'kind' && v === 'all' ? `All ${n}` : `${labels[key][v]} ${n}`;
      });
    }
  }

  function setDisputes(disputes) {
    disputesById = new Map((disputes || []).map((d) => [d.id, d]));
    renderDetail();
  }

  function matches(t) {
    if (filters.kind === 'online') return false; // the whole list is single-player
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.state === 'earned' && !isEarned(state, t.id)) return false;
    if (filters.state === 'not-earned' && isEarned(state, t.id)) return false;
    if (filters.state === 'hidden' && !t.hidden) return false;
    if (filters.state === 'disputed' && !(t.disputed || []).length) return false;
    if (filters.state === 'unconfirmed' && !t.unconfirmed) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const hay = `${t.name} ${t.description} ${t.guide || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function visibleTrophies() {
    return trophies.filter(matches);
  }

  function renderList() {
    const visible = visibleTrophies();
    listEl.replaceChildren();
    if (filters.kind === 'online') {
      const li = document.createElement('li');
      li.className = 'list-empty';
      li.innerHTML = '<b>No online trophies.</b> All 55 trophies are single-player — there is no multiplayer trophy in the list, so nothing here can expire with a server.';
      listEl.append(li);
      return;
    }
    if (!visible.length) {
      const li = document.createElement('li');
      li.className = 'list-empty';
      li.textContent = 'No trophies match these filters. Try clearing the search or a filter chip.';
      listEl.append(li);
      return;
    }
    for (const t of visible) {
      const li = document.createElement('li');
      li.dataset.id = t.id;
      if (t.id === selectedId) li.classList.add('selected');
      if (isEarned(state, t.id)) li.classList.add('earned');
      const veiled = isVeiled(t, state);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 't-check';
      box.checked = isEarned(state, t.id);
      box.setAttribute('aria-label', `Mark ${veiled ? 'story trophy' : t.name} earned`);
      box.addEventListener('click', (e) => e.stopPropagation()); // don't let the row's select handler re-render mid-toggle
      box.addEventListener('change', (e) => {
        e.stopPropagation();
        setEarned(state, t.id, box.checked);
        onChange();
      });
      const body = document.createElement('div');
      body.className = 't-body';
      let badges = gradeBadge(t);
      if (t.hidden) badges += ' <span class="badge hidden-badge">Hidden</span>';
      if (t.missable) badges += ' <span class="badge danger">Missable</span>';
      if (t.at_risk && !t.missable) badges += ' <span class="badge warn">At risk</span>';
      if (t.unconfirmed) badges += ' <span class="badge warn">Unconfirmed</span>';
      if ((t.disputed || []).length) badges += ' <span class="badge">Disputed</span>';
      if (t.count_target) {
        const c = getCount(state, t.id);
        badges += ` <span class="badge ${c >= t.count_target ? 'ok' : ''}">${c}/${t.count_target}</span>`;
      }
      body.innerHTML = `<div class="t-name"><span class="t-order">#${roadmapOrder.get(t.id)}</span> ${escapeHtml(displayName(t, state))}</div><div class="t-desc">${escapeHtml(displayDesc(t, state))}</div><div class="t-meta">${badges}</div>`;
      li.append(box, body);
      li.addEventListener('click', () => select(t.id));
      listEl.append(li);
    }
  }

  function renderDetail() {
    const t = trophies.find((x) => x.id === selectedId);
    if (!t) {
      detailEl.innerHTML = '<div class="detail-empty">Select a trophy from the list to read its guide.</div>';
      renderRail(null);
      return;
    }
    if (isVeiled(t, state)) {
      detailEl.innerHTML = `<div class="spoiler-veil">
        <h2>Hidden story trophy</h2>
        <p>This is a story trophy from ${escapeHtml(t.chapter || 'the campaign')}. Its name and description are hidden by the spoiler setting.</p>
        <button type="button" id="revealBtn">Reveal this trophy</button>
        <p class="rail-note">Earned story trophies reveal themselves automatically.</p>
      </div>`;
      document.getElementById('revealBtn').addEventListener('click', () => {
        setRevealed(state, t.id);
        onChange();
      });
      renderRail(t);
      return;
    }
    const earned = isEarned(state, t.id);
    let badges = gradeBadge(t);
    if (t.hidden) badges += ' <span class="badge hidden-badge">Hidden on PSN</span>';
    badges += ` <span class="badge">${escapeHtml(t.kind)}</span>`;
    if (t.chapter) badges += ` <span class="badge">${escapeHtml(t.chapter)}</span>`;
    if (t.roadmap_stage !== null && t.roadmap_stage !== undefined) badges += ` <span class="badge">Roadmap stage ${t.roadmap_stage}</span>`;
    badges += ` <span class="badge">Roadmap #${roadmapOrder.get(t.id)}</span>`;
    if (t.missable) badges += ' <span class="badge danger">Possibly missable</span>';
    if (t.at_risk) badges += ' <span class="badge warn">At risk</span>';
    if (t.unconfirmed) badges += ' <span class="badge warn">Unconfirmed</span>';

    let callouts = '';
    if (t.missable && t.missable_window) {
      callouts += `<div class="callout danger"><h3>Missable window</h3><p>${escapeHtml(t.missable_window)}</p></div>`;
    }
    if (t.at_risk && t.at_risk_reason && !t.missable) {
      callouts += `<div class="callout"><h3>Why this is at risk</h3><p>${escapeHtml(t.at_risk_reason)}</p></div>`;
    }
    if (t.unconfirmed) {
      callouts += `<div class="callout"><h3>Not fully confirmed</h3><p>At least one part of this guide is still unconfirmed by the sources — see the steps below and the Disputes tab.</p></div>`;
    }

    let disputeHtml = '';
    for (const did of t.disputed || []) {
      const d = disputesById.get(`D${did}`);
      if (!d) continue;
      const vers = d.versions.map((v, i) => `<p class="ver"><b>Version ${i + 1}:</b> ${escapeHtml(v.text)} ${citeLinks(v.sources)}</p>`).join('');
      disputeHtml += `<div class="dispute-panel"><h3>Sources differ — ${escapeHtml(d.title)}</h3>${vers}<p class="call"><b>Our call:</b> ${escapeHtml(d.our_call)}</p></div>`;
    }

    let countHtml = '';
    if (t.count_target) {
      const c = getCount(state, t.id);
      const step = countStep(t.count_target);
      countHtml = `<div class="count-box">
        <button type="button" data-count="-${step}" aria-label="Decrease count">−</button>
        <span class="count-num">${c.toLocaleString()} / ${t.count_target.toLocaleString()}</span>
        <button type="button" data-count="+${step}" aria-label="Increase count">+</button>
        <span class="count-label">${escapeHtml(t.count_label || '')} · steps of ${step.toLocaleString()}</span>
      </div>`;
    }

    const stepsHtml = (t.steps || []).map((s) => `<li>${escapeHtml(s.text)} ${citeLinks(s.sources)}</li>`).join('');
    detailEl.innerHTML = `
      <div class="detail-head"><h2>${escapeHtml(t.name)}</h2><span class="grade-tag ${t.grade}">${t.grade}</span></div>
      <p class="official-desc">${escapeHtml(t.description)}</p>
      <div class="detail-badges">${badges}</div>
      <div class="detail-actions">
        <button type="button" id="earnBtn" class="${earned ? '' : 'primary'}">${earned ? 'Mark as not earned' : 'Mark as earned'}</button>
      </div>
      ${countHtml}
      <p class="guide-text">${escapeHtml(t.guide)}</p>
      ${callouts}
      <ol class="steps">${stepsHtml}</ol>
      ${disputeHtml}`;
    document.getElementById('earnBtn').addEventListener('click', () => {
      setEarned(state, t.id, !isEarned(state, t.id));
      onChange();
    });
    detailEl.querySelectorAll('[data-count]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.count, 10);
        setCount(state, t.id, getCount(state, t.id) + delta, t.count_target);
        onChange();
      });
    });
    renderRail(t);
  }

  function renderRail(t) {
    const nextUp = trophies
      .filter((x) => !isEarned(state, x.id))
      .sort((a, b) => (a.roadmap_stage ?? 9) - (b.roadmap_stage ?? 9) || a.id - b.id)
      .slice(0, 6);
    let html = '<div class="rail-section"><h3>Next up</h3><ul class="nextup">';
    if (!nextUp.length) {
      html += '<li>Everything earned — enjoy the platinum.</li>';
    }
    for (const n of nextUp) {
      html += `<li data-next="${n.id}"><span class="nu-grade">${n.grade}</span> · ${escapeHtml(displayName(n, state))}</li>`;
    }
    html += '</ul></div>';
    if (t) {
      const used = new Map();
      for (const s of t.steps || []) {
        for (const id of new Set(s.sources || [])) used.set(id, (used.get(id) || 0) + 1);
      }
      html += '<div class="rail-section"><h3>Sources for this guide</h3>';
      if (!used.size) {
        html += '<p class="rail-note">No cited steps yet.</p>';
      } else {
        html += '<ul class="rail-sources">';
        for (const [id, n] of [...used.entries()].sort((a, b) => a[0] - b[0])) {
          const src = sourcesById.get(id);
          html += `<li><span class="src-num">[${id}]</span>${src ? escapeHtml(src.site) : 'Source ' + id} <span class="rail-note">· ${n} claim${n > 1 ? 's' : ''}</span></li>`;
        }
        html += '</ul>';
      }
      html += `<p class="rail-note">Every step in this guide cites at least one source read on 21 Nov 2026. See the Sources tab for the full list.</p></div>`;
    }
    railEl.innerHTML = html;
    railEl.querySelectorAll('[data-next]').forEach((li) => {
      li.addEventListener('click', () => select(parseInt(li.dataset.next, 10)));
    });
  }

  function select(id) {
    selectedId = id;
    renderList();
    renderDetail();
  }

  function setFilter(key, value) {
    filters[key] = value;
    renderList();
  }

  function refresh() {
    setChipCounts();
    renderList();
    renderDetail();
  }

  function selectFirstVisible() {
    const v = visibleTrophies();
    if (v.length && !v.some((t) => t.id === selectedId)) select(v[0].id);
    else renderList();
  }

  return { setDisputes, setFilter, select, refresh, selectFirstVisible, visibleTrophies };
}
