// The 100% checklist view: all 35 lines of the in-game completion checklist,
// each with its required number, the total that exists, its weight toward the
// 100%, and its citations. Counts are entered here and saved in the browser;
// the overall percentage uses the in-game weights. Loaded later by import()
// so it is not in the first load.
import { escapeHtml, displayName } from './tracker.js';
import { getChecklistCount, setChecklistCount } from './store.js';

function citeLinks(sources) {
  return (sources || []).map((n) => `<span class="cite"><a href="#sources" data-src="${n}">[${n}]</a></span>`).join(' ');
}

function stepFor(required) {
  if (required >= 10000) return 1000;
  if (required >= 100) return 5;
  return 1;
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

export function renderChecklist(el, checklist, trophiesById, state, onSelectTrophy) {
  const lines = checklist.lines;
  const groups = checklist.groups;

  function lineProgress(line) {
    return Math.min(getChecklistCount(state, line.id), line.required) / line.required;
  }
  function overallPct() {
    let total = 0;
    for (const line of lines) total += line.weight * lineProgress(line);
    return total;
  }
  function doneCount() {
    return lines.filter((l) => lineProgress(l) >= 1).length;
  }

  function render() {
    const pct = overallPct();
    let html = `<p class="view-intro"><b>${doneCount()}/${lines.length} lines done · ${pct.toFixed(0)}% by in-game weight.</b> The checklist only appears in the game after the story, but everything you do before then counts. Enter your counts below — they are saved in this browser and included in Export. Weights are GTABase's (see dispute D13).</p>
    <div class="progress-wrap" style="padding:0 0 12px"><div class="progress-line"><span id="checklistPct">${pct.toFixed(1)}% complete</span><span>${doneCount()} / ${lines.length} lines</span></div>
    <div class="progress-bar"><div style="width:${pct}%"></div></div></div>`;

    for (const group of groups) {
      const groupLines = lines.filter((l) => l.group === group.id);
      const groupPct = groupLines.reduce((sum, l) => sum + l.weight * lineProgress(l), 0);
      const groupDone = groupLines.filter((l) => lineProgress(l) >= 1).length;
      html += `<div class="stage"><div class="stage-head"><h2>${escapeHtml(group.name)} — ${group.weight}% of the checklist</h2><span class="stage-time">${groupDone}/${groupLines.length} lines · ${groupPct.toFixed(0)}%</span></div><div class="checklist-lines">`;
      for (const line of groupLines) {
        const count = getChecklistCount(state, line.id);
        const done = count >= line.required;
        const total = line.total ? ` of ${fmt(line.total)}` : '';
        const trophy = line.trophy_id ? trophiesById.get(line.trophy_id) : null;
        const step = stepFor(line.required);
        html += `<div class="check-line${done ? ' done' : ''}">
          <div class="check-label"><b>${escapeHtml(line.label)}</b> <span class="check-meta">${fmt(line.required)}${total} ${escapeHtml(line.unit)} · ${line.weight}% ${citeLinks(line.sources)}</span>
          ${trophy ? `<button type="button" class="chip" data-trophy="${trophy.id}">Guide: ${escapeHtml(displayName(trophy, state))}</button>` : ''}</div>
          <div class="check-controls">
            <button type="button" data-check-dec="${line.id}" aria-label="Decrease">−</button>
            <input type="number" min="0" max="${line.total || line.required}" value="${count}" data-check-input="${line.id}" aria-label="${escapeHtml(line.label)} count">
            <button type="button" data-check-inc="${line.id}" aria-label="Increase">+</button>
            <span class="check-frac">${fmt(count)} / ${fmt(line.required)}</span>
          </div>
        </div>`;
      }
      html += '</div></div>';
    }
    el.innerHTML = html;

    el.querySelectorAll('[data-check-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const line = lines.find((l) => l.id === btn.dataset.checkDec);
        setChecklistCount(state, line.id, getChecklistCount(state, line.id) - stepFor(line.required), line.total || line.required);
        render();
      });
    });
    el.querySelectorAll('[data-check-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const line = lines.find((l) => l.id === btn.dataset.checkInc);
        setChecklistCount(state, line.id, getChecklistCount(state, line.id) + stepFor(line.required), line.total || line.required);
        render();
      });
    });
    el.querySelectorAll('[data-check-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const line = lines.find((l) => l.id === input.dataset.checkInput);
        setChecklistCount(state, line.id, parseInt(input.value, 10) || 0, line.total || line.required);
        render();
      });
    });
    el.querySelectorAll('[data-trophy]').forEach((btn) => {
      btn.addEventListener('click', () => onSelectTrophy(parseInt(btn.dataset.trophy, 10)));
    });
  }

  render();
}
