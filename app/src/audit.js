// Audit numbers for the guide, computed from the data files at runtime —
// never typed in. A "claim" is one step in trophies.json or roadmap.json, one
// roadmap fact, one chapter entry, or one 100% checklist line. A claim is
// cited if it carries at least one source number, and backed by 2+ sources
// if it carries two or more distinct source numbers.

export function allClaims(trophies, roadmap, checklist) {
  const claims = [];
  for (const t of trophies) {
    for (const s of t.steps || []) claims.push({ ...s, trophy: t.id });
  }
  if (roadmap) {
    for (const stage of roadmap.stages || []) {
      for (const s of stage.steps || []) claims.push({ ...s, stage: stage.id });
    }
    for (const f of roadmap.facts || []) claims.push({ ...f, fact: true });
    for (const c of roadmap.chapters || []) claims.push({ ...c, chapter: true });
  }
  if (checklist) {
    for (const line of checklist.lines || []) claims.push({ ...line, checklist: true });
  }
  return claims;
}

export function computeAudit(trophies, roadmap, sourcesMeta, disputes, checklist) {
  const claims = allClaims(trophies, roadmap, checklist);
  const cited = claims.filter((c) => (c.sources || []).length >= 1).length;
  const backed = claims.filter((c) => new Set(c.sources || []).size >= 2).length;
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) grades[t.grade] = (grades[t.grade] || 0) + 1;
  const guidesCited = trophies.filter((t) => (t.steps || []).length && t.steps.every((s) => (s.sources || []).length >= 1)).length;
  return {
    total: trophies.length,
    grades,
    hidden: trophies.filter((t) => t.hidden).length,
    claims: claims.length,
    cited,
    backed,
    guidesCited,
    pages: sourcesMeta.pages_read,
    sites: sourcesMeta.sites_read,
    readDate: sourcesMeta.read_date,
    missable: trophies.filter((t) => t.missable).length,
    atRisk: trophies.filter((t) => t.at_risk).length,
    unconfirmed: trophies.filter((t) => t.unconfirmed).length,
    disputes: disputes ? disputes.length : 0,
  };
}

// How many claims each source backs, for the Sources view and the rail.
export function perSourceCounts(trophies, roadmap, checklist, sourceIds) {
  const counts = new Map(sourceIds.map((id) => [id, 0]));
  for (const c of allClaims(trophies, roadmap, checklist)) {
    for (const id of new Set(c.sources || [])) {
      if (counts.has(id)) counts.set(id, counts.get(id) + 1);
    }
  }
  return counts;
}

// How many of the 55 trophy guides cite each source.
export function perSourceGuides(trophies, sourceIds) {
  const counts = new Map(sourceIds.map((id) => [id, 0]));
  for (const t of trophies) {
    const used = new Set();
    for (const s of t.steps || []) for (const id of s.sources || []) used.add(id);
    for (const id of used) if (counts.has(id)) counts.set(id, counts.get(id) + 1);
  }
  return counts;
}

export function renderAuditBar(el, a) {
  const items = [
    `<b>${a.total}/${a.total}</b> official trophies`,
    `<b>${a.grades.platinum}P ${a.grades.gold}G ${a.grades.silver}S ${a.grades.bronze}B</b>`,
    `<b>${a.hidden}</b> PSN-hidden`,
    `<b>${a.cited}/${a.claims}</b> claims cited`,
    `<b>${a.backed}</b> backed by 2+ sources`,
    `<b>${a.guidesCited}/${a.total}</b> guides fully cited`,
    `<b>${a.pages}</b> pages · <b>${a.sites}</b> sites read ${a.readDate}`,
    `<b>${a.missable}</b> possibly missable`,
    `<b>${a.atRisk}</b> at risk`,
    `<b>${a.unconfirmed}</b> unconfirmed`,
    `<b>${a.disputes}</b> disputes shown both ways`,
  ];
  el.innerHTML = items.map((x) => `<span>${x}</span>`).join('<span class="audit-sep">·</span>');
}
