(() => {
'use strict';

/* ===== Centralized configuration (edit here; nothing below hard-codes rules) ===== */
const CONFIG = {
  maxSubjects: 15,
  gradeSets: { default: { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 } },
  // verified:false => results are labelled unverified. pctFactor:null => no official factor configured.
  regulations: {
    2024: { label: '2024 Regulation', grades: 'default', verified: false, pctFactor: null },
    2023: { label: '2023 Regulation', grades: 'default', verified: false, pctFactor: null },
    2022: { label: '2022 Regulation', grades: 'default', verified: false, pctFactor: null }
  },
  courses: [
    { id: 'btech', name: 'B.Tech', semesters: 8, branches: true, configured: true },
    { id: 'bpharm', name: 'B.Pharm' }, { id: 'mba', name: 'MBA' }, { id: 'mca', name: 'MCA' },
    { id: 'bba', name: 'BBA' }, { id: 'bca', name: 'BCA' }, { id: 'mtech', name: 'M.Tech' },
    { id: 'mpharm', name: 'M.Pharm' }, { id: 'other', name: 'Other' }
  ],
  branches: ['CSE', 'CSIT', 'CSE (AI & ML)', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Other']
};

/* ===== Storage ===== */
const KEY = 'aktucalc:v1';
const fresh = () => ({ v: 1, course: '', reg: '', branch: '', sem: 1, theme: 'light', drafts: {}, saved: {}, factor: '' });
let S = fresh();
const loadFromLocalStorage = () => {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1) S = Object.assign(fresh(), d); } catch (e) { S = fresh(); }
};
const saveToLocalStorage = () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Browser storage unavailable; data will not persist.', true); }
};

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);
const course = () => CONFIG.courses.find(c => c.id === S.course);
const reg = () => CONFIG.regulations[S.reg];
const grades = () => CONFIG.gradeSets[reg().grades];
const blank = () => ({ name: '', code: '', credits: '', grade: '' });
const draft = () => (S.drafts[S.sem] = S.drafts[S.sem] || [blank()]);
const isEmpty = s => !s.name.trim() && !s.code.trim() && s.credits === '' && !s.grade;
const f2 = n => (Number.isFinite(n) ? n.toFixed(2) : '–');
let tt;
function toast(t, bad) {
  const el = $('toast'); el.textContent = t; el.hidden = false; el.style.background = bad ? 'var(--bad)' : '';
  clearTimeout(tt); tt = setTimeout(() => (el.hidden = true), 2500);
}
function show(el, text, cls) { el.textContent = text; el.className = 'msg ' + (cls || ''); el.hidden = !text; }

/* ===== Calculation ===== */
function validateSubjects(subs) {
  if (!S.course) return 'Please select a course.';
  if (!S.reg) return 'Please select the applicable regulation.';
  if (course().branches && !S.branch) return 'Please select a branch.';
  const used = subs.filter(s => !isEmpty(s));
  if (!used.length) return 'No eligible subjects are available for calculation.';
  for (const s of used) {
    if (!s.name.trim()) return 'Please enter a name for every subject.';
    const c = Number(s.credits);
    if (s.credits === '' || !Number.isFinite(c) || c <= 0) return 'Please enter valid subject credits.';
    if (!(s.grade in grades())) return 'Please select a grade for each required subject.';
  }
  return '';
}
function calculateSGPA(subs) {
  const err = validateSubjects(subs);
  if (err) return { err };
  let credits = 0, points = 0, count = 0;
  subs.filter(s => !isEmpty(s)).forEach(s => { const c = Number(s.credits); credits += c; points += c * grades()[s.grade]; count++; });
  if (!(credits > 0)) return { err: 'Total credits must be greater than zero.' };
  const sgpa = points / credits;
  return Number.isFinite(sgpa) ? { sgpa, credits, points, count } : { err: 'Calculation failed.' };
}
function calculateCGPA() {
  let pts = 0, cr = 0, n = 0;
  Object.values(S.saved).forEach(r => { if (r.include) { pts += r.points; cr += r.credits; n++; } });
  return cr > 0 ? { cgpa: pts / cr, credits: cr, n } : null;
}
function calculatePercentage(cgpa) {
  const k = S.factor !== '' ? Number(S.factor) : reg() && reg().pctFactor;
  if (!Number.isFinite(k) || k <= 0 || cgpa == null) return null;
  return { pct: cgpa * k, k, official: S.factor === '' };
}

/* ===== Rendering ===== */
function renderCourseSelection() {
  const box = $('courseCards'); box.textContent = '';
  CONFIG.courses.forEach(c => {
    const b = document.createElement('button');
    b.className = 'card' + (c.id === S.course ? ' sel' : ''); b.dataset.action = 'course'; b.dataset.id = c.id;
    b.textContent = c.name;
    const sm = document.createElement('small'); sm.textContent = c.configured ? 'Manual entry (unverified rules)' : 'Rules not configured'; b.appendChild(sm);
    box.appendChild(b);
  });
}
function fillSelect(sel, items, val, ph) {
  sel.textContent = '';
  const o = new Option(ph, ''); sel.appendChild(o);
  items.forEach(([v, l]) => sel.appendChild(new Option(l, v)));
  sel.value = val;
}
function renderOptions() {
  const c = course(); const ok = c && c.configured;
  $('workspace').hidden = !ok;
  show($('notice'), !c ? 'Select a course above to begin.' : ok ? '' : 'The calculation rules for this course and regulation have not yet been verified or configured, so calculation is disabled.', 'warn');
  if (!ok) return;
  fillSelect($('reg'), Object.entries(CONFIG.regulations).map(([k, v]) => [k, v.label]), S.reg, 'Select regulation');
  $('branchWrap').hidden = !c.branches;
  fillSelect($('branch'), CONFIG.branches.map(b => [b, b]), S.branch, 'Select branch');
  const t = $('semTabs'); t.textContent = '';
  for (let i = 1; i <= c.semesters; i++) {
    const b = document.createElement('button');
    b.className = 'tab' + (i === S.sem ? ' sel' : '') + (S.saved[i] ? ' has' : ''); b.dataset.action = 'sem'; b.dataset.n = i;
    b.textContent = 'Sem ' + i; t.appendChild(b);
  }
  $('semTitle').textContent = 'Semester ' + S.sem + (S.saved[S.sem] ? ' (saved)' : '');
  renderSubjectForm();
}
function renderSubjectForm() {
  const box = $('rows'); box.textContent = '';
  const mk = (cls, label, type, f, i, v, extra) => {
    const l = document.createElement('label'); l.className = cls; l.textContent = label;
    const inp = document.createElement(type === 'grade' ? 'select' : 'input');
    if (type === 'grade') { inp.appendChild(new Option('Grade', '')); Object.keys(grades()).forEach(g => inp.appendChild(new Option(g, g))); }
    else { inp.type = type; if (extra) Object.assign(inp, extra); }
    inp.value = v; inp.dataset.f = f; inp.dataset.i = i; l.appendChild(inp); return l;
  };
  draft().forEach((s, i) => {
    const r = document.createElement('div'); r.className = 'row';
    r.appendChild(mk('nm', 'Subject name', 'text', 'name', i, s.name, { placeholder: 'e.g. Data Structures' }));
    r.appendChild(mk('', 'Code (optional)', 'text', 'code', i, s.code, { placeholder: 'BCS301' }));
    r.appendChild(mk('', 'Credits', 'number', 'credits', i, s.credits, { min: 0, step: 0.5, placeholder: '4' }));
    r.appendChild(mk('', 'Grade', 'grade', 'grade', i, s.grade));
    const d = document.createElement('button'); d.className = 'btn ghost'; d.dataset.action = 'remove'; d.dataset.i = i;
    d.setAttribute('aria-label', 'Remove subject'); d.textContent = '✕'; r.appendChild(d);
    box.appendChild(r);
  });
}
function updateDashboard() {
  const keys = Object.keys(S.saved).map(Number).sort((a, b) => a - b);
  const cg = calculateCGPA(), p = cg && calculatePercentage(cg.cgpa);
  const cur = S.saved[S.sem];
  const subjects = keys.reduce((a, k) => a + S.saved[k].count, 0);
  const stats = [['Current SGPA', cur ? f2(cur.sgpa) : '–'], ['CGPA', cg ? f2(cg.cgpa) : '–'], ['Percentage', p ? f2(p.pct) + '%' : '–'],
    ['Saved semesters', keys.length], ['Subjects recorded', subjects], ['Eligible credits', cg ? cg.credits : '–']];
  const d = $('dash'); d.textContent = '';
  stats.forEach(([l, v]) => { const c = document.createElement('div'); c.className = 'card'; const b = document.createElement('b'); b.textContent = v; c.append(b, l); d.appendChild(c); });
  updatePerformanceChart();
  const sv = $('saved'); sv.textContent = '';
  keys.forEach(k => {
    const r = S.saved[k], row = document.createElement('div'); row.className = 'srow';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = r.include; cb.dataset.action = 'include'; cb.dataset.n = k; cb.setAttribute('aria-label', 'Include semester ' + k);
    const t = document.createElement('span'); t.textContent = `Sem ${k}: SGPA ${f2(r.sgpa)}, ${r.credits} credits`;
    const ed = document.createElement('button'); ed.className = 'btn ghost'; ed.dataset.action = 'sem'; ed.dataset.n = k; ed.textContent = 'Open / Edit';
    row.append(cb, t, ed); sv.appendChild(row);
  });
  if (!keys.length) sv.textContent = 'Nothing saved yet.';
  const r = reg();
  $('pctInfo').textContent = r && r.pctFactor == null && S.factor === '' ? 'No verified conversion factor is configured for this regulation. Enter one from your official rules; it will be labelled as user-provided.' : 'Formula: Percentage = CGPA × K.';
  $('pctOut').textContent = p ? `Percentage = ${f2(cg.cgpa)} × ${p.k} = ${f2(p.pct)}% (${p.official ? 'configured' : 'user-provided, unverified'}; ${r ? r.label : ''})` : 'Percentage unavailable until CGPA and a factor exist.';
}
function updatePerformanceChart() {
  const c = course(), ch = $('chart'); ch.textContent = '';
  const n = c && c.semesters || 8;
  $('empty').hidden = Object.keys(S.saved).length > 0;
  for (let i = 1; i <= n; i++) {
    const col = document.createElement('div'); col.className = 'bcol';
    const r = S.saved[i]; const bar = document.createElement('i'); bar.style.height = r ? r.sgpa * 10 + '%' : '0';
    col.append(r ? f2(r.sgpa) : '', bar, 'S' + i); ch.appendChild(col);
  }
}
function render() { renderCourseSelection(); renderOptions(); updateDashboard(); $('factor').value = S.factor; }

/* ===== Actions ===== */
function currentResult() {
  const r = calculateSGPA(draft());
  const out = $('sgpaOut');
  if (r.err) { out.hidden = true; show($('msg'), r.err, 'err'); return null; }
  out.hidden = false; out.textContent = `SGPA: ${f2(r.sgpa)} (${r.credits} credits)` + (reg().verified ? '' : ' - unverified rules');
  show($('msg'), '', ''); return r;
}
function saveSemester() {
  const r = currentResult(); if (!r) return;
  S.saved[S.sem] = { sgpa: r.sgpa, credits: r.credits, points: r.points, count: r.count, include: S.saved[S.sem] ? S.saved[S.sem].include : true };
  saveToLocalStorage(); render(); toast('Semester ' + S.sem + ' saved.');
}
function resetCurrentSemester() { if (!confirm('Reset entries for this semester?')) return; delete S.drafts[S.sem]; saveToLocalStorage(); $('sgpaOut').hidden = true; render(); }
function deleteSemester() {
  if (!S.saved[S.sem]) return toast('This semester has no saved result.', true);
  if (!confirm('Delete saved result for semester ' + S.sem + '?')) return;
  delete S.saved[S.sem]; saveToLocalStorage(); render(); toast('Deleted.');
}
function clearAllData() { if (!confirm('Delete ALL saved data in this browser?')) return; const t = S.theme; S = fresh(); S.theme = t; saveToLocalStorage(); $('sgpaOut').hidden = true; render(); }
function toggleTheme() { S.theme = S.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; saveToLocalStorage(); }

/* ===== Events (delegated, attached once) ===== */
function onClick(e) {
  const t = e.target.closest('[data-action]'); if (!t) return;
  const a = t.dataset.action;
  if (a === 'course') { S.course = t.dataset.id; S.sem = 1; saveToLocalStorage(); render(); $('calculator').scrollIntoView({ behavior: 'smooth' }); }
  else if (a === 'sem') { S.sem = Number(t.dataset.n); saveToLocalStorage(); $('sgpaOut').hidden = true; render(); if (t.closest('#saved')) $('calculator').scrollIntoView({ behavior: 'smooth' }); }
  else if (a === 'add') { if (draft().length >= CONFIG.maxSubjects) return toast('Subject limit reached.', true); draft().push(blank()); saveToLocalStorage(); renderSubjectForm(); }
  else if (a === 'remove') { draft().splice(Number(t.dataset.i), 1); if (!draft().length) draft().push(blank()); saveToLocalStorage(); renderSubjectForm(); }
  else if (a === 'calc') currentResult();
  else if (a === 'save') saveSemester();
  else if (a === 'reset') resetCurrentSemester();
  else if (a === 'delsem') deleteSemester();
  else if (a === 'clearall') clearAllData();
  else if (a === 'theme') toggleTheme();
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.action === 'include') { S.saved[t.dataset.n].include = t.checked; saveToLocalStorage(); updateDashboard(); }
  else if (t.id === 'reg') { S.reg = t.value; saveToLocalStorage(); render(); }
  else if (t.id === 'branch') { S.branch = t.value; saveToLocalStorage(); }
}
function onInput(e) {
  const t = e.target;
  if (t.dataset.f) { draft()[Number(t.dataset.i)][t.dataset.f] = t.value; saveToLocalStorage(); }
  else if (t.id === 'factor') { S.factor = t.value; saveToLocalStorage(); updateDashboard(); }
}
function initializeApp() {
  loadFromLocalStorage();
  document.documentElement.dataset.theme = S.theme;
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  render();
}
initializeApp();
})();
