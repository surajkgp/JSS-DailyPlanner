/* JSS DAILY PLANNER — Highlight Edition (v2.4)
   - PRM header removed from all pages
   - PRM pill added only inside cycle summary
   - Final Total Points removed
   - Highlight-only animations
*/

const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

/* ---------------- Global Styles ---------------- */
(function addGlobalStyles() {
  if (document.getElementById("jss-final-styles")) return;
  const st = document.createElement("style");
  st.id = "jss-final-styles";
  st.innerHTML = `
    .card{background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(2,6,23,0.06)}
    .jss-error{color:#b91c1c}
    .jss-note{font-size:12px;color:#6b7280}

    /* Highlight Pulse */
    .jss-highlight{
      animation: highlightPulse 2.6s ease-in-out infinite;
      border-radius: 10px;
    }
    @keyframes highlightPulse {
      0% { box-shadow: 0 0 0 rgba(99,102,241,0); }
      50% { box-shadow: 0 0 14px rgba(99,102,241,0.35); }
      100% { box-shadow: 0 0 0 rgba(99,102,241,0); }
    }

    .kpi-row { display:flex; gap:1rem; overflow-x:auto; }
    .kpi-item { min-width:180px; flex:1; }

    .prm-pill {
      background:#eef2ff;
      color:#1e3a8a;
      padding:6px 10px;
      border-radius:12px;
      display:inline-block;
      font-size:12px;
      font-weight:600;
      margin-bottom:10px;
    }
  `;
  document.head.appendChild(st);
})();

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showInlineError(sel, msg) {
  const area = qs(sel);
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

/* ---------------- Pay Cycle ---------------- */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;
  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }
  return { start, end, sDate: new Date(y,m,start), eDate: new Date(y,m,end) };
}

/* ---------------- Calculations ---------------- */
function calculatePoints(target, days) {
  if (days <= 0) return { points: 0, rate: 20 };
  const solve = (T, rate, d, bonus) => (T - d * bonus) / rate;

  let p1 = solve(target, 40, days, 100);
  if (p1 > 24 && p1/days >= 3) return { points: Math.ceil(p1), rate: 40 };

  let p2 = solve(target, 40, days, 0);
  if (p2 > 24) return { points: Math.ceil(p2), rate: 40 };

  let p3 = solve(target, 20, days, 100);
  if (p3 <= 24 && p3/days >= 3) return { points: Math.ceil(p3), rate: 20 };

  let p4 = solve(target, 20, days, 0);
  if (p4 <= 24) return { points: Math.ceil(p4), rate: 20 };

  return { points: Math.ceil(solve(target, 40, days, 0)), rate: 40 };
}

function earning(points, rate) {
  return points * rate + (points >= 3 ? 100 : 0);
}

function disclaimerHTML() {
  return `<div class="text-center text-xs text-gray-400 mt-4">Note: This planner helps you estimate your daily points. Actual earnings may differ.</div>`;
}

/* ---------------- LOGIN PAGE ---------------- */
function showLoginView() {
  html("#content", `
    <div class="text-center mt-4 mb-6">
      <h1 class="text-2xl font-extrabold text-indigo-700">JSS Daily Planner</h1>
      <p class="text-sm text-gray-500 mt-1">Your personalised planner for the pay cycle.</p>
    </div>

    <div class="card p-5 mb-4" id="loginCard">
      <label class="text-sm font-medium">PRM ID</label>
      <input id="loginId" maxlength="8" inputmode="numeric"
        class="w-full mt-2 p-3 border rounded-lg" placeholder="66xxxxxx">

      <label class="text-sm font-medium mt-4">Your Name (Optional)</label>
      <input id="loginName"
        class="w-full mt-2 p-3 border rounded-lg" placeholder="e.g - Shyam">

      <button id="loginBtn"
        class="w-full bg-indigo-600 text-white p-3 rounded-lg mt-5 font-semibold">
        Continue
      </button>

      <div id="loginErrorContainer"></div>
    </div>

    ${disclaimerHTML()}
  `);

  qs("#loginBtn").onclick = () => {
    clearInlineError("#loginErrorContainer");

    const id = qs("#loginId").value.trim();
    const name = escapeHtml(qs("#loginName").value.trim()).slice(0, 64);

    if (!/^66\d{6}$/.test(id)) {
      showInlineError("#loginErrorContainer", "Please enter a valid 8-digit ID starting with 66.");
      return;
    }

    localStorage.setItem("jss_id", id);
    localStorage.setItem("jss_name", name);

    showInputView();
  };
}

/* ---------------- INPUT PAGE ---------------- */
function showInputView() {
  if (!localStorage.getItem("jss_id")) return showLoginView();

  const id = escapeHtml(localStorage.getItem("jss_id"));
  const name = escapeHtml(localStorage.getItem("jss_name") || "");

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;

  const fmt = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  const X = Math.max(0, today.getDate() - cycle.start);
  const disableEarned = X === 0;

  html("#content", `
    <div class="text-center mb-4">
      <h2 class="text-xl font-extrabold text-indigo-700">Daily Target Planner</h2>
      <p class="text-sm text-gray-500">Enter your goal. Get your daily target instantly.</p>
    </div>

    <div class="jss-highlight text-center p-2 rounded-lg mb-4">
      <div class="text-sm font-semibold text-indigo-700">Your Pay Cycle</div>
      <div class="text-lg font-bold text-gray-800">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
    </div>

    <div class="card p-5">
      <form id="calcForm">

        <label class="text-sm font-medium">Earning Goal (₹)</label>
        <input id="target" type="number" min="1"
          class="w-full p-3 border rounded-lg mt-2 mb-3" placeholder="e.g. 5000">

        <label class="text-sm font-medium">Points Earned (Last ${X} Days)</label>
        <input id="earned" type="number" min="0" ${disableEarned ? "disabled" : ""}
          class="w-full p-3 border rounded-lg mt-2 mb-3 ${disableEarned ? "bg-gray-100 text-gray-400" : ""}"
          placeholder="${disableEarned ? 'Not applicable on Day 1' : 'e.g - ' + X}">

        <label class="text-sm font-medium">Available Days</label>
        <input id="days" type="number" min="1" max="${remaining}"
          class="w-full p-3 border rounded-lg mt-2" placeholder="Max: ${remaining}">
        <div class="jss-note mt-1">You have ${remaining} days left in this cycle.</div>

        <button class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold mt-5">
          Calculate My Daily Target
        </button>

        <div id="inputErrorContainer"></div>
      </form>
    </div>

    ${disclaimerHTML()}
  `);

  qs("#calcForm").onsubmit = (e) => {
    e.preventDefault();
    clearInlineError("#inputErrorContainer");

    const target = Number(qs("#target").value);
    const earned = Number(qs("#earned").value) || 0;
    const days = Number(qs("#days").value);

    if (!target || target <= 0) return showInlineError("#inputErrorContainer", "Enter a valid earning goal.");
    if (earned < 0) return showInlineError("#inputErrorContainer", "Points earned cannot be negative.");
    if (!days || days <= 0) return showInlineError("#inputErrorContainer", "Enter available days.");
    if (days > remaining) return showInlineError("#inputErrorContainer", `Maximum allowed: ${remaining} days.`);

    const { points: requiredPoints, rate } = calculatePoints(target, days);
    const remainingPoints = Math.max(0, requiredPoints - earned);

    const finalTotal = earned + remainingPoints;
    const finalRate = finalTotal > 24 ? 40 : rate;

    const daily = remainingPoints > 0 ? Math.ceil(remainingPoints / days) : 0;
    const dailyEarn = earning(daily, finalRate);

    showResultsPage({ daily, dailyEarn, requiredPoints, earned, remainingPoints, finalRate });
  };
}

/* ---------------- RESULTS PAGE ---------------- */
function showResultsPage(r) {
  const id = escapeHtml(localStorage.getItem("jss_id"));
  const name = escapeHtml(localStorage.getItem("jss_name") || "");

  html("#content", `
    <button id="backBtn" class="text-indigo-600 font-semibold mb-3">← Back</button>

    <h2 class="text-center text-xl font-extrabold text-indigo-700 mb-4">Your Daily Plan</h2>

    <div class="card p-5 mb-4 jss-highlight">

      <div class="prm-pill">PRM ID: ${id} &nbsp; | &nbsp; ${name}</div>

      <div class="text-center text-sm font-semibold text-indigo-800 mb-3">Cycle Progress Summary</div>

      <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div>Total Points Needed</div><div class="text-right font-semibold">${r.requiredPoints}</div>
        <div>Points Completed</div><div class="text-right font-semibold">${r.earned}</div>
        <div>Points Still Required</div><div class="text-right font-semibold">${r.remainingPoints}</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-item card p-5 text-center jss-highlight">
        <div class="text-4xl font-extrabold text-indigo-700">${r.daily}</div>
        <div class="text-sm text-gray-500 mt-1">Daily Target Points</div>
      </div>

      <div class="kpi-item card p-5 text-center jss-highlight">
        <div class="text-4xl font-extrabold text-green-700">₹${r.dailyEarn}</div>
        <div class="text-sm text-gray-500 mt-1">Expected Daily Earnings</div>
      </div>
    </div>

    ${
      r.requiredPoints > 24
        ? `<div class="mt-3 bg-yellow-100 text-yellow-900 text-center p-3 rounded-lg font-semibold jss-highlight">
            You unlocked the higher rate: ₹40 per point!
           </div>`
        : ""
    }

    <button id="downloadBtn" class="w-full bg-green-600 text-white p-3 rounded-lg font-semibold mt-6">
      Download Plan as Image
    </button>

    ${disclaimerHTML()}
  `);

  qs("#backBtn").onclick = showInputView;

  qs("#downloadBtn").onclick = async () => {
    const el = qs("#content");
    const canvas = await html2canvas(el, { scale: 2 });
    const link = document.createElement("a");
    link.download = "jss_daily_plan.png";
    link.href = canvas.toDataURL();
    link.click();
  };
}

/* ---------------- Init ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("jss_id");
  localStorage.removeItem("jss_name");
  showLoginView();
});
