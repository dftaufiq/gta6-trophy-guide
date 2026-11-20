// The roadmap view: cited platinum facts, then five stages from a fresh save
// to the platinum, each with its steps, its trophies and your progress in the
// stage. Loaded later by import() so it is not in the first load.
import { escapeHtml, displayName } from './tracker.js';
import { isEarned } from './store.js';

function citeLinks(sources) {
  return (sources || []).map((n) => `<span class="cite"><a href="#sources" data-src="${n}">[${n}]</a></span>`).join(' ');
}

export function renderRoadmap(el, roadmap, trophies, state, onSelectTrophy) {
  let html = `<p class="view-intro"><b>${escapeHtml(roadmap.title || 'Platinum roadmap')}.</b> About 200 hours in one playthrough: story first, then the 100% checklist, then Strangers &amp; Freaks and cleanup. Every fact and step below is cited.</p>`;

  if (roadmap.facts && roadmap.facts.length) {
    html += '<div class="fact-chips">';
    for (const f of roadmap.facts) {
      html += `<span class="fact-chip"><b>${escapeHtml(f.label)}:</b> ${escapeHtml(f.text)} ${citeLinks(f.sources)}</span>`;
    }
    html += '</div>';
  }

  for (const stage of roadmap.stages) {
    const stageTrophies = trophies.filter((t) => t.roadmap_stage === stage.id);
    const earnedN = stageTrophies.filter((t) => isEarned(state, t.id)).length;
    const steps = stage.steps.map((s) => `<li>${escapeHtml(s.text)} ${citeLinks(s.sources)}</li>`).join('');
    const chips = stageTrophies.map((t) => {
      const earned = isEarned(state, t.id);
      return `<button type="button" class="chip stage-trophy${earned ? ' earned' : ''}" data-trophy="${t.id}">${escapeHtml(displayName(t, state))}</button>`;
    }).join('');
    html += `<div class="stage">
      <div class="stage-head"><h2>${escapeHtml(stage.name)}</h2><span class="stage-time">${escapeHtml(stage.time)}</span></div>
      <p class="stage-goal">${escapeHtml(stage.goal)}</p>
      <ol class="steps">${steps}</ol>
      ${stageTrophies.length ? `<div class="stage-trophies"><div class="stage-progress"><b>${earnedN}/${stageTrophies.length} earned in this stage</b><div class="progress-bar"><div style="width:${stageTrophies.length ? Math.round((earnedN / stageTrophies.length) * 100) : 0}%"></div></div></div><div class="chip-row">${chips}</div></div>` : ''}
    </div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-trophy]').forEach((btn) => {
    btn.addEventListener('click', () => onSelectTrophy(parseInt(btn.dataset.trophy, 10)));
  });
}
