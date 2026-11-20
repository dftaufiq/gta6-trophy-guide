// The sources view: every page read while building this guide, numbered the
// way the [n] citations in the guides point at them, with the number of claims
// each one backs and how many of the 55 guides cite it. Loaded later by
// import() so it is not in the first load.
import { escapeHtml } from './tracker.js';

export function renderSources(el, sourcesMeta, perSource, perGuides) {
  const list = sourcesMeta.sources;
  let html = `<p class="view-intro"><b>${sourcesMeta.pages_read} pages from ${sourcesMeta.sites_read} sites, all read on ${escapeHtml(sourcesMeta.read_date)}.</b> Every guide step cites at least one of these pages; the counts after each source are how many claims it backs and how many of the 55 trophy guides cite it. Nothing here was copied — the guide text is original, the citations show where each fact came from.</p><ol class="source-list">`;
  for (const s of list) {
    const n = perSource.get(s.id) || 0;
    const g = perGuides ? perGuides.get(s.id) || 0 : 0;
    html += `<li id="src-${s.id}">
      <div><span class="src-site">${escapeHtml(s.site)}</span> — <span class="src-page">${escapeHtml(s.page)}</span></div>
      <div class="src-url"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.url)}</a></div>
      <div class="src-count">Backs ${n} claim${n === 1 ? '' : 's'} in this guide · cited by ${g} of 55 trophy guides.</div>
    </li>`;
  }
  html += '</ol>';
  el.innerHTML = html;
}
