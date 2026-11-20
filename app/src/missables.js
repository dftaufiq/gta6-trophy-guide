// The missables view: the one possibly missable trophy and everything else at
// risk — character-locked lines, a slow-respawning robbery, and the trophies
// whose triggers are still unconfirmed — plus a last-chance grid and the story
// gates chapter by chapter. Loaded later by import() so it is not in the
// first load.
import { escapeHtml, displayName } from './tracker.js';
import { isEarned } from './store.js';

function citeLinks(sources) {
  return (sources || []).map((n) => `<span class="cite"><a href="#sources" data-src="${n}">[${n}]</a></span>`).join(' ');
}

// The last point a trophy can still be earned, from its flags. Only one
// trophy has a real deadline; the rest are open after the story or unknown.
function lastChance(t) {
  if (t.missable) return { text: 'Chapter 1', cls: 'danger' };
  if (t.id === 25) return { text: 'Unknown — timed race', cls: 'warn' };
  if (t.unconfirmed) return { text: 'Unknown', cls: 'warn' };
  return { text: 'After the story', cls: 'ok' };
}

export function renderMissables(el, trophies, state, roadmap, onSelectTrophy) {
  const atRisk = trophies.filter((t) => t.at_risk);
  const missable = atRisk.filter((t) => t.missable);
  const unconfirmed = atRisk.filter((t) => t.unconfirmed && !t.missable);
  const other = atRisk.filter((t) => !t.unconfirmed && !t.missable);
  let html = `<p class="view-intro"><b>${atRisk.length} trophies need extra care.</b> ${missable.length} is possibly missable, ${unconfirmed.length} have unconfirmed triggers, and ${other.length} more are easy to overlook. Nothing else in the list can be missed.</p>`;

  // Last-chance grid: one row per trophy to watch.
  html += `<h2>Last-chance grid</h2><table class="grid-table"><thead><tr><th>Trophy</th><th>Opens</th><th>Last chance</th><th>Why watch it</th></tr></thead><tbody>`;
  for (const t of atRisk) {
    const lc = lastChance(t);
    const why = t.missable && t.missable_window ? t.missable_window : (t.at_risk_reason || '');
    html += `<tr data-trophy="${t.id}"><td><b>${escapeHtml(displayName(t, state))}</b>${isEarned(state, t.id) ? ' <span class="badge ok">Earned</span>' : ''}</td><td>${escapeHtml(t.chapter || 'Anytime')}</td><td><span class="badge ${lc.cls}">${escapeHtml(lc.text)}</span></td><td>${escapeHtml(why)}</td></tr>`;
  }
  html += '</tbody></table>';

  function card(t) {
    const earned = isEarned(state, t.id);
    const why = t.missable && t.missable_window ? t.missable_window : (t.at_risk_reason || '');
    return `<div class="miss-card" data-trophy="${t.id}">
      <h2>${escapeHtml(displayName(t, state))} ${earned ? '<span class="badge ok">Earned</span>' : ''}</h2>
      <p class="miss-why">${escapeHtml(why)}</p>
      <p>${t.missable ? '<span class="badge danger">Possibly missable</span>' : ''} ${t.unconfirmed ? '<span class="badge warn">Unconfirmed</span>' : ''} <span class="badge">${escapeHtml(t.grade)}</span></p>
    </div>`;
  }

  if (missable.length) {
    html += '<h2>Possibly missable</h2>' + missable.map(card).join('');
  }
  if (unconfirmed.length) {
    html += '<h2>Unconfirmed triggers</h2>' + unconfirmed.map(card).join('');
  }
  if (other.length) {
    html += '<h2>Easy to overlook</h2>' + other.map(card).join('');
  }

  // Story gates: what each chapter opens, and which trophies live there.
  if (roadmap && roadmap.chapters) {
    const byId = new Map(trophies.map((t) => [t.id, t]));
    html += '<h2>Story gates — chapter by chapter</h2><p class="view-intro">Missions and trophy unlocks per chapter, from the guides we read. Story trophies stay veiled here while the spoiler shield is on.</p>';
    for (const ch of roadmap.chapters) {
      const chips = ch.trophies.map((id) => {
        const t = byId.get(id);
        if (!t) return '';
        return `<button type="button" class="chip stage-trophy${isEarned(state, id) ? ' earned' : ''}" data-trophy="${id}">${escapeHtml(displayName(t, state))}</button>`;
      }).join('');
      html += `<div class="stage"><div class="stage-head"><h2>${escapeHtml(ch.chapter)}</h2><span class="stage-time">${ch.trophies.length} trophies</span></div>
        <p class="stage-goal"><b>Missions:</b> ${ch.missions.map(escapeHtml).join(' · ')} ${citeLinks(ch.sources)}</p>
        <div class="stage-trophies"><div class="chip-row">${chips}</div></div></div>`;
    }
  }

  el.innerHTML = html;
  el.querySelectorAll('[data-trophy]').forEach((c) => {
    c.addEventListener('click', () => onSelectTrophy(parseInt(c.dataset.trophy, 10)));
  });
}
