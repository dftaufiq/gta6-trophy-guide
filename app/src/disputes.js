// The disputes view: where our sources disagree, both sides are shown with
// their citations and our call. Loaded later by import() so it is not in the
// first load.
import { escapeHtml } from './tracker.js';

function citeLinks(sources) {
  return (sources || []).map((n) => `<span class="cite"><a href="#sources" data-src="${n}">[${n}]</a></span>`).join(' ');
}

export function renderDisputes(el, disputes, trophiesById, onSelectTrophy) {
  let html = `<p class="view-intro"><b>${disputes.length} places where the sources disagree.</b> We show every version with its citations and say what this guide does — a guide that hides its disagreements can't be trusted on the rest.</p>`;
  for (const d of disputes) {
    const vers = d.versions.map((v, i) => `<p class="ver"><b>Version ${i + 1}:</b> ${escapeHtml(v.text)} ${citeLinks(v.sources)}</p>`).join('');
    const links = (d.trophies || []).map((id) => {
      const t = trophiesById.get(id);
      return t ? `<button type="button" class="chip" data-trophy="${id}">${escapeHtml(t.name)}</button>` : '';
    }).join(' ');
    html += `<div class="dispute-card">
      <h2><span class="d-id">${escapeHtml(d.id)}</span>${escapeHtml(d.title)}</h2>
      ${vers}
      <p class="call"><b>Our call:</b> ${escapeHtml(d.our_call)}</p>
      ${links ? `<div class="chip-row">${links}</div>` : ''}
    </div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-trophy]').forEach((btn) => {
    btn.addEventListener('click', () => onSelectTrophy(parseInt(btn.dataset.trophy, 10)));
  });
}
