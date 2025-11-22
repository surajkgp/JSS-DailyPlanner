/* JSS DAILY PLANNER — Final Update (v2.4.1)
   - PRM pill: moved to OUTPUT page only
   - PRM pill: full-width (stretches left to right), no fill, only border, navy text
   - All earlier validations, forced login, highlight boxes preserved
   - UPLOADED_IMAGE_PATH kept as reference per developer note (not used in UI)
*/

/* Local uploaded file path (preserved for tooling - not used in UI) */
const UPLOADED_IMAGE_PATH = '/mnt/data/69102280-9abc-4fe9-b2d8-2a163f8dcba5.png';

const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

/* ---------------- Global Styles ---------------- */
(function addGlobalStyles() {
  if (document.getElementById("jss-final-styles")) return;
  const st = document.createElement("style");
  st.id = "jss-final-styles";
  st.innerHTML = `
    :root{
      --navy:#1e3a8a;
      --muted:#6b7280;
      --indigo-50:#eef2ff;
      --border:#e6eefc;
    }
    .card{background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(2,6,23,0.06)}
    .jss-error{color:#b91c1c}
    .jss-note{font-size:12px;color:var(--muted)}
    .kpi-row { display:flex; gap:1rem; overflow-x:auto; }
    .kpi-item { min-width:180px; flex:1; }
    /* subtle highlight (kept for cards) */
    .jss-highlight { box-shadow: 0 0 0 rgba(99,102,241,0); border-radius:10px; }
    /* PRM pill - OUTPUT page ONLY: full width, border only, navy text, no shadow */
    .prm-pill-output {
      display:block;
      width:100%;
      box-sizing:border-box;
      padding:10px 14px;
      border-radius:9999px;
      border:1px solid var(--border);
      color:var(--navy);
      font-weight:600;
      font-size:13px;
      text-align:center;
      background: transparent;
      margin-bottom:12px;
    }
    /* accessibility / small-screen helpers */
    .text-center { text-align:center; }
    .mb-4 { margin-bottom:1rem; }
    .mt-4 { margin-top:1rem; }
    .p-5 { padding:1.25rem; }
    .rounded-lg { border-radius:0.75rem; }
    .w-full { width:100%; }
  `;
  document.head.appendChild(st);
})();

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function showInlineError(sel, msg) {
  const area = qs(sel);
  if (!area) return;
  let el = area.querySelector(".jss-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "jss-error mt-2 text-sm";
    area.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
}
function clearInlineError(sel) {
  const el = qs(sel)?.querySelector(".jss-error");
  if (el) el.style.display = "none";
}

/* ---------------- Pay Cycle & Calculation ---------------- */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;
  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }
  return { start, end, sDate: new Date(y,m,start), eDate: new Date(y,m,end) };
}

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
  return { points: Math.ceil(solve(target, 40, days, 0)), rate: 40 };
}

function earning(points, rate) {
  return (points * rate) + (points >= 3 ? 100 : 0);
}

function disclaimerHTML() {
  return `<div class="text-center" style="font-size:12px;color:#6b7280;margin-top:12px">Note: This planner helps you estimate your daily points. Actual earnings may differ.</div>`;
}

/* ---------------- Views ---------------- */

/* LOGIN view (no PRM shown top) */
function showLoginView() {
  html("#content", `
    <div class="p-6">
      <h1 class="text-center" style="font-size:20px;font-weight:800;color:#1e40af">JSS Daily Planner</h1>
      <p class="text-center" style="color:#6b7280;margin-top:6px;margin-bottom:18px">Your personalised planner for the pay cycle.</p>

      <div class="p-5 bg-white rounded-lg card">
        <label class="text-sm font-medium">PRM ID</label>
        <input id="loginId" maxlength="8" inputmode="numeric" class="w-full p-3 border rounded-lg mt-2 mb-3" placeholder="66xxxxxx">

        <label class="text-sm font-medium">Your Name (Optional)</label>
        <input id="loginName" class="w-full p-3 border rounded-lg mt-2 mb-3" placeholder="e.g - Shyam">

        <button id="loginBtn" class="w-full" style="background:#3730a3;color:white;padding:12px;border-radius:8px;font-weight:700">Continue</button>

        <div id="loginErr" style="margin-top:10px;color:#b91c1c;display:none;font-size:13px"></div>
      </div>

      ${disclaimerHTML()}
    </div>
  `);

  qs("#loginBtn").onclick = () => {
    const id = (qs("#loginId").value || "").trim();
    const name = (qs("#loginName").value || "").trim();
    if (!/^66\d{6}$/.test(id)) {
      const err = qs("#loginErr");
      err.textContent = "Please enter a valid 8-digit ID starting with 66.";
      err.style.display = "block";
      return;
    }
    try {
      localStorage.setItem("jss_id", id);
      localStorage.setItem("jss_name", name);
    } catch (e) {
      // ignore storage failures - still proceed
    }
    showInputView();
  };
}

/* INPUT view (no PRM pill here) */
function showInputView() {
  if (!localStorage.getItem("jss_id")) return showLoginView();

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;
  const daysOld = Math.max(0, today.getDate() - cycle.start);
  const fmt = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  html("#content", `
    <div class="p-6">
      <h2 class="text-center" style="font-size:18px;font-weight:700;color:#1e40af">Daily Target Planner</h2>
      <p class="text-center" style="color:#6b7280;margin-top:6px;margin-bottom:14px">Enter your goal. Get your daily target instantly.</p>

      <div class="p-4 bg-indigo-50 rounded-lg mb-4" style="border:1px solid #c7defa;text-align:center">
        <div style="color:#3730a3;font-weight:700">Your Pay Cycle</div>
        <div style="font-weight:800;color:#111827;margin-top:6px">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
      </div>

      <div class="card p-5">
        <form id="calcForm">
          <div style="margin-bottom:12px">
            <label class="text-sm font-medium">Earning Goal (₹)</label>
            <input id="target" type="number" class="w-full p-3 border rounded-lg mt-2" placeholder="e.g. 5000">
          </div>

          <div style="margin-bottom:12px">
            <label class="text-sm font-medium">Points Earned (Last ${daysOld} Days)</label>
            <input id="earned" type="number" ${daysOld === 0 ? 'disabled' : ''} class="w-full p-3 border rounded-lg mt-2 ${daysOld === 0 ? 'opacity-60' : ''}" placeholder="${daysOld === 0 ? 'Not applicable on Day 1' : 'e.g - '+daysOld}">
          </div>

          <div style="margin-bottom:12px">
            <label class="text-sm font-medium">Available Days</label>
            <input id="days" type="number" class="w-full p-3 border rounded-lg mt-2" placeholder="Max: ${remaining}">
            <div style="font-size:12px;color:#6b7280;margin-top:6px">You have ${remaining} days left in this cycle.</div>
          </div>

          <button type="submit" class="w-full" style="background:#3730a3;color:white;padding:12px;border-radius:8px;font-weight:700">Calculate My Daily Target</button>
        </form>
      </div>

      ${disclaimerHTML()}
    </div>
  `);

  qs("#calcForm").onsubmit = (ev) => {
    ev.preventDefault();
    const t = Number(qs("#target").value);
    const earned = Number(qs("#earned").value) || 0;
    const d = Number(qs("#days").value);

    if (!Number.isFinite(t) || t <= 0) { alert("Enter a valid earning goal."); return; }
    if (!Number.isFinite(d) || d <= 0) { alert("Enter valid available days."); return; }

    if (d > remaining) { alert(`Available days cannot exceed remaining days (${remaining}).`); return; }

    const { points: requiredPoints, rate: baseRate } = calculatePoints(t, d);
    const remainingPoints = Math.max(0, requiredPoints - earned);
    const finalTotal = earned + remainingPoints;
    const finalRate = finalTotal > 24 ? 40 : baseRate;
    const daily = remainingPoints > 0 ? Math.ceil(remainingPoints / d) : 0;
    const dailyEarn = earning(daily, finalRate);

    showResultsPage({
      daily, dailyEarn, requiredPoints, earned, remainingPoints, finalTotal
    });
  };
}

/* RESULTS view - PRM pill only here, full width, border only */
function showResultsPage(r) {
  if (!localStorage.getItem("jss_id")) return showLoginView();
  const id = escapeHtml(localStorage.getItem("jss_id") || "");
  const name = escapeHtml(localStorage.getItem("jss_name") || "");

  html("#content", `
    <div class="p-6">
      <button id="backBtn" style="background:none;border:none;color:#3730a3;font-weight:700;margin-bottom:12px">← Back</button>

      <h2 class="text-center" style="font-size:18px;font-weight:700;color:#1e40af;margin-bottom:8px">Your Daily Plan</h2>

      <!-- PRM pill full-width, border-only (no fill, no shadow) -->
      <div>
        <div class="prm-pill-output" aria-hidden="false">PRM ID: ${id} &nbsp; | &nbsp; Name: ${name || '—'}</div>
      </div>

      <!-- Payout Cycle Summary box -->
      <div class="p-4 bg-indigo-50 rounded-lg mb-4" style="border:1px solid #c7defa">
        <div style="text-align:center;color:#3730a3;font-weight:700;margin-bottom:8px">Payout Cycle Summary</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;color:#374151;font-size:14px">
          <div>Total Points Needed</div><div style="text-align:right;font-weight:700">${r.requiredPoints}</div>
          <div>Points Completed</div><div style="text-align:right;font-weight:700">${r.earned}</div>
          <div>Points Still Required</div><div style="text-align:right;font-weight:700">${r.remainingPoints}</div>
        </div>
      </div>

      <!-- KPI tiles -->
      <div style="display:grid;grid-template-columns:1fr;gap:12px;">
        <div class="p-5 bg-white rounded-lg" style="border:1px solid #e6eefc;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#3730a3">${r.daily}</div>
          <div style="color:#6b7280;margin-top:6px">Daily Target Points</div>
        </div>

        <div class="p-5 bg-white rounded-lg" style="border:1px solid #e6f6ef;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#047857">₹${r.dailyEarn}</div>
          <div style="color:#6b7280;margin-top:6px">Expected Daily Earnings</div>
        </div>
      </div>

      ${r.finalTotal > 24 ? `<div style="margin-top:12px;padding:12px;background:#fef3c7;border-radius:8px;color:#92400e;font-weight:700;text-align:center">You unlocked the higher rate: ₹40 per point!</div>` : ''}

      <button id="download" style="width:100%;margin-top:16px;background:#059669;color:#fff;padding:12px;border-radius:8px;font-weight:700;border:0">Download Plan as Image</button>

      ${disclaimerHTML()}
    </div>
  `);

  qs("#backBtn").onclick = showInputView;

  qs("#download").onclick = async () => {
    try {
      const el = qs("#content");
      const canvas = await html2canvas(el, { scale: 2 });
      const link = document.createElement("a");
      link.download = "jss_daily_plan.png";
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      alert("Download failed. Try a modern browser or take a screenshot.");
    }
  };
}

/* INIT - force login on every page load */
window.addEventListener("DOMContentLoaded", () => {
  try {
    localStorage.removeItem("jss_id");
    localStorage.removeItem("jss_name");
  } catch (e) { /* ignore */ }
  showLoginView();
});
