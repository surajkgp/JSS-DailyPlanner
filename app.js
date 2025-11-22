/* JSS DAILY PLANNER — Robust Final with Animations (v2.2)
   - All fixes applied (cases 1,2,3,4,5,7,9,17,20)
   - Dynamic "Last X Days" logic included (disabled on Day 1)
   - Forced login every load (only our keys cleared)
   - Inline validation and friendly inline errors (no alerts)
   - Login rate-limiter (sessionStorage)
   - Name sanitization + truncation + title tooltip
   - html2canvas download fallback with friendly message
   - Disclaimer on all pages
   - Animations: Pay Cycle period (fade+slide) and KPI tiles (pop)
   - No header image used in UI (uploaded path kept as constant for tooling)
*/

/* ---------------- REFERENCE TO UPLOADED FILE (kept but not used in UI) ----- */
const UPLOADED_IMAGE_PATH = '/mnt/data/69102280-9abc-4fe9-b2d8-2a163f8dcba5.png';
/* -------------------------------------------------------------------------- */

/* ---------------- Utilities ---------------- */
const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showInlineError(containerSelector, msg) {
  const container = qs(containerSelector);
  if (!container) return;
  let el = container.querySelector('.jss-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'jss-error mt-2 text-sm text-red-600';
    container.appendChild(el);
  }
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

function clearInlineError(containerSelector) {
  const container = qs(containerSelector);
  if (!container) return;
  const el = container.querySelector('.jss-error');
  if (el) el.style.display = 'none';
}

/* ---------------- Minimal global styles + animations ---------------- */
(function addGlobalStyles() {
  if (document.getElementById('jss-final-styles')) return;
  const st = document.createElement('style');
  st.id = 'jss-final-styles';
  st.innerHTML = `
    .card{background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(2,6,23,0.06)}
    .jss-error{color:#b91c1c}
    .jss-note{font-size:12px;color:#6b7280}
    .prm-name{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block}
    button:disabled{opacity:.6;cursor:not-allowed}

    /* Pay cycle animation: fade + slide up */
    .jss-paycycle-anim {
      opacity: 0;
      transform: translateY(8px);
      animation: paycycleFadeUp 420ms cubic-bezier(.22,.95,.28,1) forwards;
    }
    @keyframes paycycleFadeUp {
      to { opacity: 1; transform: translateY(0); }
    }

    /* KPI tile pop animation */
    .jss-kpi-pop {
      opacity: 0;
      transform: scale(.96);
      animation: kpiPop 520ms cubic-bezier(.18,.9,.32,1) forwards;
    }
    @keyframes kpiPop {
      0% { opacity: 0; transform: scale(.96); }
      60% { opacity: 1; transform: scale(1.04); }
      100% { transform: scale(1); }
    }

    /* small responsive helpers */
    .kpi-row { display:flex; gap:1rem; overflow-x:auto; padding-bottom:4px; }
    .kpi-item { min-width:180px; flex:1 0 180px; }
    @media (min-width:640px) { .kpi-item { min-width:0; flex:1; } }
  `;
  document.head.appendChild(st);
})();

/* ---------------- Pay Cycle Logic ---------------- */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;
  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }
  return { start, end, sDate: new Date(y, m, start), eDate: new Date(y, m, end) };
}

/* ---------------- Business Logic ---------------- */
function calculatePoints(target, days) {
  if (days <= 0) return { points: 0, rate: 20 };
  const solve = (T, rate, d, bonus) => (T - d * bonus) / rate;

  let p1 = solve(target, 40, days, 100);
  if (p1 > 24 && p1 / days >= 3) return { points: Math.ceil(p1), rate: 40 };

  let p2 = solve(target, 40, days, 0);
  if (p2 > 24) return { points: Math.ceil(p2), rate: 40 };

  let p3 = solve(target, 20, days, 100);
  if (p3 <= 24 && p3 / days >= 3) return { points: Math.ceil(p3), rate: 20 };

  let p4 = solve(target, 20, days, 0);
  if (p4 <= 24) return { points: Math.ceil(p4), rate: 20 };

  let p5 = solve(target, 40, days, 0);
  return { points: Math.ceil(p5), rate: 40 };
}

function earning(points, rate) {
  return (points * rate) + (points >= 3 ? 100 : 0);
}

/* ---------------- Login rate limiter (sessionStorage) ---------------- */
const LOGIN_KEY = 'jss_login_attempts_v22';
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function recordLoginAttempt() {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(LOGIN_KEY);
    if (!raw) {
      sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ count: 1, firstTs: now }));
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }
    const obj = JSON.parse(raw);
    if (now - obj.firstTs > WINDOW_MS) {
      sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ count: 1, firstTs: now }));
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }
    obj.count += 1;
    sessionStorage.setItem(LOGIN_KEY, JSON.stringify(obj));
    if (obj.count > MAX_ATTEMPTS) {
      return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - obj.firstTs)) / 1000) };
    }
    return { allowed: true, remaining: MAX_ATTEMPTS - obj.count };
  } catch (e) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
}

function loginAttemptsInfo() {
  try {
    const raw = sessionStorage.getItem(LOGIN_KEY);
    if (!raw) return { count: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { count: 0 };
  }
}

/* ---------------- Disclaimer HTML ---------------- */
function disclaimerHTML() {
  return `<div class="mt-6 text-center text-xs text-gray-400">Note: This planner helps you estimate your daily points. Actual earnings may differ.</div>`;
}

/* ---------------- Views ---------------- */

/* LOGIN VIEW */
function showLoginView() {
  html('#content', `
    <div class="text-center mt-4 mb-6">
      <h1 class="text-2xl font-extrabold text-indigo-700">JSS Daily Planner</h1>
      <p class="text-sm text-gray-500 mt-1">Your personalised planner for the pay cycle.</p>
    </div>

    <div class="card p-5 mb-4" id="login-card">
      <label class="text-sm font-medium">PRM ID</label>
      <input id="loginId" maxlength="8" inputmode="numeric" class="w-full mt-2 p-3 border rounded-lg mb-2" placeholder="66xxxxxx">

      <label class="text-sm font-medium">Your Name (Optional)</label>
      <input id="loginName" maxlength="64" class="w-full mt-2 p-3 border rounded-lg mb-2" placeholder="e.g - Shyam">

      <div class="mt-3" style="display:flex;justify-content:space-between;align-items:center">
        <button id="loginBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold">Continue</button>
        <div id="attemptsInfo" class="text-xs text-gray-500 jss-note"></div>
      </div>

      <div id="loginErrorContainer"></div>
    </div>

    ${disclaimerHTML()}
  `);

  // attempts info
  const info = loginAttemptsInfo();
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (info.count || 0));
  qs('#attemptsInfo').textContent = `Attempts left: ${attemptsLeft}`;

  qs('#loginBtn').onclick = () => {
    clearInlineError('#loginErrorContainer');
    const idRaw = qs('#loginId').value || '';
    const nameRaw = qs('#loginName').value || '';
    const id = idRaw.trim();
    const name = nameRaw.trim();

    const res = recordLoginAttempt();
    if (!res.allowed) {
      showInlineError('#loginErrorContainer', `Too many attempts. Try again in ${res.retryAfter || 60} seconds.`);
      return;
    }

    if (!/^66\d{6}$/.test(id)) {
      showInlineError('#loginErrorContainer', 'Please enter a valid 8-digit ID starting with 66.');
      return;
    }

    const safeName = escapeHtml(name).slice(0, 64);

    try {
      localStorage.setItem('jss_id', id);
      localStorage.setItem('jss_name', safeName);
    } catch (e) {
      showInlineError('#loginErrorContainer', 'Browser storage unavailable — your session may not persist if you refresh.');
    }

    showInputView();
  };
}

/* INPUT VIEW */
function showInputView() {
  if (!localStorage.getItem('jss_id')) return showLoginView();

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;
  const fmt = (d) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  // determine dynamic X (last X days)
  const dayNumber = (today.getDate() - cycle.start) + 1; // 1-based day index in pay cycle
  const X = Math.max(0, dayNumber - 1); // last X days
  const pointsDisabled = X === 0;

  // PRM display safe + truncated
  const rawName = localStorage.getItem('jss_name') || '';
  const displayName = rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName;
  const safeDisplayName = escapeHtml(displayName);
  const safePrm = escapeHtml(localStorage.getItem('jss_id') || '—');

  html('#content', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        <div class="text-sm text-gray-500">PRM ID</div>
        <div class="text-sm font-semibold">${safePrm}</div>
      </div>
      <div style="text-align:right">
        <div class="text-sm text-gray-500">Name</div>
        <div class="text-sm font-semibold prm-name" title="${escapeHtml(rawName)}">${safeDisplayName || '—'}</div>
      </div>
    </div>

    <div class="text-center mt-2 mb-4">
      <h2 class="text-xl font-extrabold text-indigo-700">Daily Target Planner</h2>
      <p class="text-sm text-gray-500 mt-1">Enter your goal. Get your daily target instantly.</p>
    </div>

    <div class="text-center mb-4 jss-paycycle-anim">
      <div class="text-sm font-semibold text-indigo-700">Your Pay Cycle</div>
      <div class="text-lg font-bold text-gray-800">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
    </div>

    <div class="card p-5" id="inputCard">
      <form id="calcForm">
        <div id="targetRow" style="margin-bottom:12px">
          <label class="text-sm font-medium">Earning Goal (₹)</label>
          <input id="target" type="number" min="1" class="w-full mt-2 p-3 border rounded-lg" placeholder="e.g. 5000">
        </div>

        <div id="earnedRow" style="margin-bottom:12px">
          <label class="text-sm font-medium">Points Earned (Last ${X} Days)</label>
          <input id="earned" type="number" min="0" ${pointsDisabled ? 'disabled' : ''} 
            class="w-full mt-2 p-3 border rounded-lg ${pointsDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}"
            placeholder="${pointsDisabled ? 'Not applicable on Day 1' : 'e.g - ' + X}">
        </div>

        <div id="daysRow" style="margin-bottom:12px">
          <label class="text-sm font-medium">Available Days</label>
          <input id="days" type="number" min="1" max="${remaining}" class="w-full mt-2 p-3 border rounded-lg" placeholder="Max: ${remaining}">
          <div class="jss-note" id="remainingNote">You have ${remaining} days left in this cycle.</div>
        </div>

        <div style="margin-top:12px">
          <button id="calcBtn" class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">Calculate My Daily Target</button>
        </div>

        <div id="inputErrorContainer"></div>
      </form>
    </div>

    ${disclaimerHTML()}
  `);

  // after render: attach a tiny delayed pop animation to KPI container when results show (applies later)
  // calculation handler
  qs('#calcForm').onsubmit = (e) => {
    e.preventDefault();
    clearInlineError('#inputErrorContainer');

    const targetRaw = qs('#target').value;
    const earnedRaw = qs('#earned').value;
    const daysRaw = qs('#days').value;

    const target = Number(targetRaw);
    const earned = Number(earnedRaw) || 0;
    const days = Number(daysRaw);

    if (!Number.isFinite(target) || target <= 0) {
      showInlineError('#inputErrorContainer', 'Please enter a valid earning goal greater than 0.');
      return;
    }

    if (!Number.isFinite(earned) || earned < 0) {
      showInlineError('#inputErrorContainer', 'Points earned cannot be negative.');
      return;
    }

    if (!Number.isFinite(days) || days <= 0) {
      showInlineError('#inputErrorContainer', 'Please enter at least 1 available day.');
      return;
    }

    if (days > remaining) {
      showInlineError('#inputErrorContainer', `Available days cannot exceed remaining days in cycle (${remaining}).`);
      return;
    }

    const { points: requiredPoints, rate: baseRate } = calculatePoints(target, days);
    const remainingPoints = Math.max(0, requiredPoints - earned);
    const finalTotal = earned + remainingPoints;
    const finalRate = finalTotal > 24 ? 40 : 20;

    const daily = remainingPoints > 0 ? Math.ceil(remainingPoints / days) : 0;
    const dailyEarn = earning(daily, finalRate);

    showResultsPage({
      daily,
      dailyEarn,
      requiredPoints,
      earned,
      remainingPoints,
      finalTotal,
      finalRate
    });
  };
}

/* RESULTS VIEW */
function showResultsPage(r) {
  if (!localStorage.getItem('jss_id')) return showLoginView();

  const rawName = localStorage.getItem('jss_name') || '';
  const displayName = rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName;
  const safeDisplayName = escapeHtml(displayName);
  const safePrm = escapeHtml(localStorage.getItem('jss_id') || '—');

  html('#content', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        <div class="text-sm text-gray-500">PRM ID</div>
        <div class="text-sm font-semibold">${safePrm}</div>
      </div>
      <div style="text-align:right">
        <div class="text-sm text-gray-500">Name</div>
        <div class="text-sm font-semibold prm-name" title="${escapeHtml(rawName)}">${safeDisplayName || '—'}</div>
      </div>
    </div>

    <div class="text-center mt-2 mb-4">
      <h2 class="text-xl font-extrabold text-indigo-700">Your Daily Plan</h2>
    </div>

    <div class="card p-5 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg jss-paycycle-anim">
      <div class="text-center text-sm font-semibold text-indigo-800 mb-3">Cycle Progress Summary</div>

      <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div>Total Points Needed</div><div class="text-right font-semibold">${r.requiredPoints}</div>
        <div>Points Completed</div><div class="text-right font-semibold">${r.earned}</div>
        <div>Points Still Required</div><div class="text-right font-semibold">${r.remainingPoints}</div>

        <div class="pt-2 border-t text-indigo-900 font-semibold">Final Total Points</div>
        <div class="pt-2 border-t text-right font-semibold">${r.finalTotal}</div>
      </div>
    </div>

    <div class="kpi-row mb-4">
      <div class="kpi-item jss-kpi-pop p-5 bg-white rounded-lg text-center shadow">
        <div class="text-4xl font-extrabold text-indigo-700">${r.daily}</div>
        <div class="text-sm text-gray-500 mt-1">Daily Target Points</div>
      </div>

      <div class="kpi-item jss-kpi-pop p-5 bg-white rounded-lg text-center shadow">
        <div class="text-4xl font-extrabold text-green-700">₹${r.dailyEarn}</div>
        <div class="text-sm text-gray-500 mt-1">Expected Daily Earnings</div>
      </div>
    </div>

    ${r.finalTotal > 24 ? `<div style="background:#FEF3C7;padding:12px;border-radius:8px;color:#92400E;text-align:center;margin-bottom:12px;font-weight:600" class="jss-kpi-pop">You unlocked the higher rate: ₹40 per point!</div>` : ''}

    <div style="margin-bottom:12px">
      <button id="downloadBtn" style="width:100%;background:#059669;color:#fff;padding:12px;border-radius:8px;font-weight:700;border:0">Download Plan as Image</button>
    </div>

    ${disclaimerHTML()}
  `);

  // Insert Back button at top
  const contentEl = qs('#content');
  const back = document.createElement('button');
  back.textContent = '← Back';
  back.style.border = 'none';
  back.style.background = 'transparent';
  back.style.color = '#4f46e5';
  back.style.fontWeight = '600';
  back.style.cursor = 'pointer';
  back.onclick = showInputView;
  contentEl.insertBefore(back, contentEl.firstChild);

  // Download handling with try/catch (graceful fallback)
  qs('#downloadBtn').onclick = async () => {
    try {
      const el = qs('#content');
      const canvas = await html2canvas(el, { scale: 2 });
      const link = document.createElement('a');
      link.download = 'jss_daily_plan.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('html2canvas error:', err);
      showInlineError('#content', 'Download failed on this browser. Try Chrome/Firefox or take a screenshot.');
    }
  };
}

/* Init (force login by clearing our keys only) */
window.addEventListener('DOMContentLoaded', () => {
  try {
    localStorage.removeItem('jss_id');
    localStorage.removeItem('jss_name');
  } catch (e) {
    // ignore storage errors
  }
  showLoginView();
});
