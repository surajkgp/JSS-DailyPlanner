/* JSS DAILY PLANNER — Robust v2.0 (Fixes for cases 1,2,3,4,5,7,9,17,20)
   - Strong validation and inline error UI
   - Prevents invalid/negative inputs
   - Caps available days to remaining days
   - Correct rate calculation when earned >= required
   - Login rate limiting (session-based)
   - Name sanitization + truncation to prevent overflow/XSS
   - html2canvas fallback handling
   - No header image (text-only headings)
*/

/* Reference to uploaded file (kept as constant for tool workflows) */
const UPLOADED_IMAGE_PATH = '/mnt/data/69102280-9abc-4fe9-b2d8-2a163f8dcba5.png';

/* ----------------- Utilities ----------------- */
const qs = (s) => document.querySelector(s);
const html = (s, content) => (qs(s).innerHTML = content);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Inline error helper */
function showInlineError(containerSelector, message) {
  const container = qs(containerSelector);
  if (!container) return;
  let err = container.querySelector('.jss-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'jss-error mt-2 text-sm text-red-600';
    container.appendChild(err);
  }
  err.textContent = message;
  err.style.display = message ? 'block' : 'none';
}

/* Clear inline error */
function clearInlineError(containerSelector) {
  const container = qs(containerSelector);
  if (!container) return;
  const err = container.querySelector('.jss-error');
  if (err) err.style.display = 'none';
}

/* ----------------- Add minimal global styles for errors + truncation ----------------- */
(function addGlobalStyles() {
  if (document.getElementById('jss-v2-styles')) return;
  const s = document.createElement('style');
  s.id = 'jss-v2-styles';
  s.innerHTML = `
    .card { background: #fff; border-radius: 12px; box-shadow: 0 6px 16px rgba(16,24,40,0.06); }
    .jss-error { color: #b91c1c; }
    .jss-small-note { font-size: 12px; color: #6b7280; }
    .prm-name { display: inline-block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
  `;
  document.head.appendChild(s);
})();

/* ----------------- Pay Cycle Logic ----------------- */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;
  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }
  return { start, end, sDate: new Date(y, m, start), eDate: new Date(y, m, end) };
}

/* ----------------- Business Logic ----------------- */
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

/* ----------------- Login Attempt Rate Limiter (sessionStorage) ----------------- */
const LOGIN_KEY = 'jss_login_attempts_v2'; // stores {count, firstTs}
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function recordLoginAttempt() {
  try {
    const raw = sessionStorage.getItem(LOGIN_KEY);
    const now = Date.now();
    if (!raw) {
      sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ count: 1, firstTs: now }));
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }
    const obj = JSON.parse(raw);
    if (now - obj.firstTs > WINDOW_MS) {
      // reset window
      sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ count: 1, firstTs: now }));
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }
    obj.count += 1;
    sessionStorage.setItem(LOGIN_KEY, JSON.stringify(obj));
    if (obj.count > MAX_ATTEMPTS) return { allowed: false, remaining: 0, retryAfter: Math.ceil((WINDOW_MS - (now - obj.firstTs)) / 1000) };
    return { allowed: true, remaining: MAX_ATTEMPTS - obj.count };
  } catch (e) {
    // session storage might be blocked -> allow login but do not rate limit
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
}

function getLoginAttemptsInfo() {
  try {
    const raw = sessionStorage.getItem(LOGIN_KEY);
    if (!raw) return { count: 0 };
    return JSON.parse(raw);
  } catch (e) { return { count: 0 }; }
}

/* ----------------- Disclaimer HTML ----------------- */
function disclaimerHTML() {
  return `<div class="mt-6 text-center text-xs text-gray-400">Note: This planner helps you estimate your daily points. Actual earnings may differ.</div>`;
}

/* ----------------- SHOW / RENDER VIEWS ----------------- */

/* -- LOGIN VIEW (no header image; sanitized inputs; rate limit) -- */
function showLoginView() {
  html('#content', `
    <div class="text-center mt-4 mb-6">
      <h1 class="text-2xl font-extrabold text-indigo-700">JSS Daily Planner</h1>
      <p class="text-sm text-gray-500 mt-1">Your personalised planner for the pay cycle.</p>
    </div>

    <div class="card p-5 mb-4" id="loginCard">
      <div id="loginFormContainer">
        <label class="text-sm font-medium">PRM ID</label>
        <input id="loginId" maxlength="8" inputmode="numeric" class="w-full mt-2 p-3 border rounded-lg mb-2" placeholder="66xxxxxx" aria-label="PRM ID">

        <label class="text-sm font-medium">Your Name (Optional)</label>
        <input id="loginName" maxlength="64" class="w-full mt-2 p-3 border rounded-lg mb-2" placeholder="e.g - Shyam" aria-label="Name (optional)">

        <div class="flex items-center justify-between mt-3">
          <button id="loginBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold">Continue</button>
          <div id="loginAttemptsInfo" class="text-xs text-gray-500 jss-small-note"></div>
        </div>
      </div>

      <div id="loginErrorContainer" class="mt-3"></div>
    </div>

    ${disclaimerHTML()}
  `);

  // populate attempts info
  const attempts = getLoginAttemptsInfo();
  const infoEl = qs('#loginAttemptsInfo');
  if (attempts && attempts.count) {
    const remaining = Math.max(0, MAX_ATTEMPTS - attempts.count);
    infoEl.textContent = `Attempts left: ${remaining}`;
  } else {
    infoEl.textContent = `Attempts left: ${MAX_ATTEMPTS}`;
  }

  qs('#loginBtn').onclick = () => {
    clearInlineError('#loginErrorContainer');

    const idRaw = qs('#loginId').value || '';
    const nameRaw = qs('#loginName').value || '';

    const id = idRaw.trim();
    const name = nameRaw.trim();

    // rate limiter
    const res = recordLoginAttempt();
    if (!res.allowed) {
      showInlineError('#loginErrorContainer', `Too many attempts. Try again in ${res.retryAfter || 60} seconds.`);
      return;
    }

    // validation: numeric and starts with 66 and 8 digits
    if (!/^66\d{6}$/.test(id)) {
      showInlineError('#loginErrorContainer', 'Please enter a valid 8-digit ID starting with 66.');
      return;
    }

    // sanitize name: remove tags and leading/trailing spaces
    const sanitizedName = escapeHtml(name).slice(0, 64); // keep server side length cap

    // persist (only our keys)
    try {
      localStorage.setItem('jss_id', id);
      localStorage.setItem('jss_name', sanitizedName);
    } catch (e) {
      // localStorage may fail in private mode; inform user but continue
      showInlineError('#loginErrorContainer', 'Warning: Browser storage not available. Your session may not persist.');
      // still proceed to next view
      // do not return
    }

    // proceed
    showInputView();
  };
}

/* -- INPUT VIEW (with inline errors; validations) -- */
function showInputView() {
  // guard
  if (!localStorage.getItem('jss_id')) return showLoginView();

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;
  const fmt = (d) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  // show truncated PRM info safely
  const rawName = localStorage.getItem('jss_name') || '';
  const displayName = rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName;
  const safeDisplayName = escapeHtml(displayName);
  const safePrm = escapeHtml(localStorage.getItem('jss_id') || '—');

  html('#content', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div>
        <div class="text-sm text-gray-500">PRM ID</div>
        <div class="text-sm font-semibold">${safePrm}</div>
      </div>
      <div style="text-align:right;">
        <div class="text-sm text-gray-500">Name</div>
        <div class="text-sm font-semibold prm-name" title="${escapeHtml(rawName)}">${safeDisplayName ? safeDisplayName : '—'}</div>
      </div>
    </div>

    <div class="text-center mt-2 mb-4">
      <h2 class="text-xl font-extrabold text-indigo-700">Daily Target Planner</h2>
      <p class="text-sm text-gray-500 mt-1">Enter your goal. Get your daily target instantly.</p>
    </div>

    <div class="text-center mb-4">
      <div class="text-sm font-semibold text-indigo-700">Your Pay Cycle</div>
      <div class="text-lg font-bold text-gray-800">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
    </div>

    <div class="card p-5" id="inputCard">
      <form id="calcForm">
        <div id="targetRow" style="margin-bottom:12px;">
          <label class="text-sm font-medium">Earning Goal (₹)</label>
          <input id="target" type="number" min="1" class="w-full mt-2 p-3 border rounded-lg" placeholder="e.g. 5000">
        </div>

        <div id="earnedRow" style="margin-bottom:12px;">
          <label class="text-sm font-medium">Points Earned (Last X Days)</label>
          <input id="earned" type="number" min="0" class="w-full mt-2 p-3 border rounded-lg" placeholder="e.g - 20">
        </div>

        <div id="daysRow" style="margin-bottom:12px;">
          <label class="text-sm font-medium">Available Days</label>
          <input id="days" type="number" min="1" max="${remaining}" class="w-full mt-2 p-3 border rounded-lg" placeholder="Max: ${remaining}">
          <div class="jss-small-note" id="remainingNote">You have ${remaining} days left in this cycle.</div>
        </div>

        <div style="margin-top:12px;">
          <button id="calcBtn" class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">Calculate My Daily Target</button>
        </div>

        <div id="inputErrorContainer" style="margin-top:8px;"></div>
      </form>
    </div>

    ${disclaimerHTML()}
  `);

  // helper to show field-specific errors
  function showInputError(msg) {
    showInlineError('#inputErrorContainer', msg);
  }
  function clearInputError() {
    clearInlineError('#inputErrorContainer');
  }

  qs('#calcForm').onsubmit = (e) => {
    e.preventDefault();
    clearInputError();

    const targetRaw = qs('#target').value;
    const earnedRaw = qs('#earned').value;
    const daysRaw = qs('#days').value;

    const target = Number(targetRaw);
    const earned = Number(earnedRaw) || 0;
    const days = Number(daysRaw);

    // Case 1: target <= 0
    if (!Number.isFinite(target) || target <= 0) {
      showInputError('Please enter a valid earning goal greater than 0.');
      return;
    }

    // Case 3: negative earned
    if (!Number.isFinite(earned) || earned < 0) {
      showInputError('Points earned cannot be negative.');
      return;
    }

    // Case 2: days = 0 or invalid
    if (!Number.isFinite(days) || days <= 0) {
      showInputError('Please enter at least 1 available day.');
      return;
    }

    // Case 4: very high available days — cap to remaining
    if (days > remaining) {
      showInputError(`Available days cannot exceed remaining days in cycle (${remaining}).`);
      return;
    }

    // All validations passed — compute
    const { points: requiredPoints, rate: baseRate } = calculatePoints(target, days);

    // Case 7: if earned >= requiredPoints, remainingPoints = 0 and final rate based on finalTotal
    const remainingPoints = Math.max(0, requiredPoints - earned);
    const finalTotal = earned + remainingPoints;
    const finalRate = finalTotal > 24 ? 40 : 20; // final rate uses finalTotal as per rule

    // daily target: points to be achieved per active day (rounded up)
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

/* -- RESULTS VIEW -- */
function showResultsPage(r) {
  // guard: ensure logged in
  if (!localStorage.getItem('jss_id')) return showLoginView();

  // display safe/practical PRM info
  const rawName = localStorage.getItem('jss_name') || '';
  const displayName = rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName;
  const safeDisplayName = escapeHtml(displayName);
  const safePrm = escapeHtml(localStorage.getItem('jss_id') || '—');

  html('#content', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div>
        <div class="text-sm text-gray-500">PRM ID</div>
        <div class="text-sm font-semibold">${safePrm}</div>
      </div>
      <div style="text-align:right;">
        <div class="text-sm text-gray-500">Name</div>
        <div class="text-sm font-semibold prm-name" title="${escapeHtml(rawName)}">${safeDisplayName ? safeDisplayName : '—'}</div>
      </div>
    </div>

    <div class="text-center mt-2 mb-4">
      <h2 class="text-xl font-extrabold text-indigo-700">Your Daily Plan</h2>
    </div>

    <div class="card p-5 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg">
      <div class="text-center text-sm font-semibold text-indigo-800 mb-3">Cycle Progress Summary</div>

      <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div>Total Points Needed</div><div class="text-right font-semibold">${r.requiredPoints}</div>
        <div>Points Completed</div><div class="text-right font-semibold">${r.earned}</div>
        <div>Points Still Required</div><div class="text-right font-semibold">${r.remainingPoints}</div>

        <div class="pt-2 border-t text-indigo-900 font-semibold">Final Total Points</div>
        <div class="pt-2 border-t text-right font-semibold">${r.finalTotal}</div>
      </div>
    </div>

    <div style="display:flex;gap:1rem;margin-bottom:12px;overflow-x:auto;">
      <div style="min-width:180px;flex:1;background:#fff;padding:20px;border-radius:12px;box-shadow:0 6px 16px rgba(16,24,40,0.06);text-align:center">
        <div style="font-size:32px;font-weight:800;color:#3730a3">${r.daily}</div>
        <div style="color:#6b7280;margin-top:6px">Daily Target Points</div>
      </div>

      <div style="min-width:180px;flex:1;background:#fff;padding:20px;border-radius:12px;box-shadow:0 6px 16px rgba(16,24,40,0.06);text-align:center">
        <div style="font-size:32px;font-weight:800;color:#047857">₹${r.dailyEarn}</div>
        <div style="color:#6b7280;margin-top:6px">Expected Daily Earnings</div>
      </div>
    </div>

    ${r.finalTotal > 24 ? `<div style="background:#FEF3C7;padding:12px;border-radius:8px;color:#92400E;text-align:center;margin-bottom:12px;font-weight:600">You unlocked the higher rate: ₹40 per point!</div>` : ''}

    <div style="margin-bottom:12px;">
      <button id="downloadBtn" style="width:100%;background:#059669;color:#fff;padding:12px;border-radius:8px;font-weight:700;border:0">Download Plan as Image</button>
    </div>

    ${disclaimerHTML()}
  `);

  qs('#downloadBtn').onclick = async () => {
    // Case 9: html2canvas errors handled gracefully
    try {
      const el = qs('#content');
      const canvas = await html2canvas(el, { scale: 2 });
      const link = document.createElement('a');
      link.download = 'jss_daily_plan.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('html2canvas failed:', err);
      // Friendly user guidance
      const msg = 'Download failed on this browser. Try a modern browser (Chrome/Firefox) or take a screenshot.';
      // show inline error near download button
      showInlineError('#content', msg);
    }
  };

  // back button
  // create a lightweight back control to go to input
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  backBtn.style.background = 'transparent';
  backBtn.style.border = 'none';
  backBtn.style.color = '#4f46e5';
  backBtn.style.fontWeight = '600';
  backBtn.style.cursor = 'pointer';
  backBtn.onclick = showInputView;

  // insert back button at top-left of content (if not already)
  const contentEl = qs('#content');
  if (contentEl && contentEl.firstChild) {
    // put back button before first child
    contentEl.insertBefore(backBtn, contentEl.firstChild);
  }
}

/* ----------------- INIT (force login by clearing only our keys) ----------------- */
window.addEventListener('DOMContentLoaded', () => {
  try {
    localStorage.removeItem('jss_id');
    localStorage.removeItem('jss_name');
  } catch (e) {
    // ignore storage errors
  }
  showLoginView();
});
