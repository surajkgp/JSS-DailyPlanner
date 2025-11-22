/* ---------------------------------------------------
   JSS DAILY PLANNER — NO IMAGE HEADER VERSION
   - Forced Login
   - Clean Text Headings
   - Mid-cycle recalculation
   - Cycle Summary
   - One-row KPI tiles
   - Mobile Responsive
   - Disclaimer added to all pages
---------------------------------------------------- */

const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

/* ------------------ Pay Cycle Logic ------------------ */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;

  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }

  return { start, end, sDate: new Date(y, m, start), eDate: new Date(y, m, end) };
}

/* ------------------ Points + Earnings ------------------ */
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

/* ------------------ Reusable Disclaimer Block ------------------ */
function disclaimerHTML() {
  return `
    <div class="mt-6 text-center text-xs text-gray-400">
      Note: This planner helps you estimate your daily points. Actual earnings may differ.
    </div>
  `;
}

/* ------------------ LOGIN PAGE ------------------ */
function showLoginView() {
  html("#content", `
    <div class="text-center mt-4 mb-6">
      <h1 class="text-2xl font-extrabold text-indigo-700">JSS Daily Planner</h1>
      <p class="text-sm text-gray-500 mt-1">Your personalised planner for the pay cycle.</p>
    </div>

    <div class="card p-5 mb-4">
      <label class="text-sm font-medium">PRM ID</label>
      <input id="loginId" maxlength="8" inputmode="numeric"
        class="w-full mt-2 p-3 border rounded-lg mb-4" placeholder="66xxxxxx">

      <label class="text-sm font-medium">Your Name (Optional)</label>
      <input id="loginName"
        class="w-full mt-2 p-3 border rounded-lg mb-4" placeholder="e.g - Shyam">

      <button id="loginBtn" class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
        Continue
      </button>

      <p id="loginError" class="mt-3 text-sm text-red-600 hidden">
        Please enter a valid 8-digit ID starting with 66.
      </p>
    </div>

    ${disclaimerHTML()}
  `);

  qs("#loginBtn").onclick = () => {
    const id = qs("#loginId").value.trim();
    const valid = /^66\d{6}$/.test(id);

    if (!valid) {
      qs("#loginError").classList.remove("hidden");
      return;
    }

    qs("#loginError").classList.add("hidden");

    localStorage.setItem("jss_id", id);
    localStorage.setItem("jss_name", qs("#loginName").value.trim());

    showInputView();
  };
}

/* ------------------ INPUT PAGE ------------------ */
function showInputView() {
  if (!localStorage.getItem("jss_id")) return showLoginView();

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;
  const fmt = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  html("#content", `
    <div class="text-center mt-4 mb-6">
      <h2 class="text-xl font-extrabold text-indigo-700">Daily Target Planner</h2>
      <p class="text-sm text-gray-500 mt-1">Enter your goal. Get your daily target instantly.</p>
    </div>

    <div class="text-center mb-4">
      <div class="text-sm font-semibold text-indigo-700">Your Pay Cycle</div>
      <div class="text-lg font-bold text-gray-800">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
    </div>

    <div class="card p-5">
      <form id="calcForm" class="space-y-4">

        <div>
          <label class="text-sm font-medium">Earning Goal (₹)</label>
          <input id="target" type="number" class="w-full p-3 border rounded-lg mt-2" placeholder="e.g. 5000">
        </div>

        <div>
          <label class="text-sm font-medium">Points Earned (Last X Days)</label>
          <input id="earned" type="number" class="w-full p-3 border rounded-lg mt-2" placeholder="e.g - 20">
        </div>

        <div>
          <label class="text-sm font-medium">Available Days</label>
          <input id="days" type="number" class="w-full p-3 border rounded-lg mt-2" placeholder="Max: ${remaining}">
          <p class="text-xs text-gray-500 mt-2">You have ${remaining} days left in this cycle.</p>
        </div>

        <button class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
          Calculate My Daily Target
        </button>
      </form>
    </div>

    ${disclaimerHTML()}
  `);

  qs("#calcForm").onsubmit = (e) => {
    e.preventDefault();

    const target = parseInt(qs("#target").value);
    const earned = parseInt(qs("#earned").value) || 0;
    const days = parseInt(qs("#days").value);

    if (!target || !days) { alert("Enter valid numbers."); return; }
    if (days > remaining) { alert("Days exceed remaining cycle."); return; }

    const { points: requiredPoints, rate: baseRate } = calculatePoints(target, days);
    const remainingPoints = Math.max(0, requiredPoints - earned);
    const finalTotal = earned + remainingPoints;

    const finalRate = finalTotal > 24 ? 40 : baseRate;

    const daily = Math.ceil(remainingPoints / days);
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

/* ------------------ RESULTS PAGE ------------------ */
function showResultsPage(r) {
  html("#content", `
    <div class="text-center mt-4 mb-6">
      <h2 class="text-xl font-extrabold text-indigo-700">Your Daily Plan</h2>
    </div>

    <button id="back" class="text-indigo-600 mb-3">← Back</button>

    <div class="card p-5 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg">
      <div class="text-center text-sm font-semibold text-indigo-800 mb-3">
        Cycle Progress Summary
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div>Total Points Needed</div><div class="text-right font-semibold">${r.requiredPoints}</div>
        <div>Points Completed</div><div class="text-right font-semibold">${r.earned}</div>
        <div>Points Still Required</div><div class="text-right font-semibold">${r.remainingPoints}</div>

        <div class="pt-2 border-t text-indigo-900 font-semibold">Final Total Points</div>
        <div class="pt-2 border-t text-right font-semibold">${r.finalTotal}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="p-5 bg-white rounded-lg text-center shadow">
        <div class="text-4xl font-extrabold text-indigo-700">${r.daily}</div>
        <div class="text-sm text-gray-500 mt-1">Daily Target Points</div>
      </div>

      <div class="p-5 bg-white rounded-lg text-center shadow">
        <div class="text-4xl font-extrabold text-green-700">₹${r.dailyEarn}</div>
        <div class="text-sm text-gray-500 mt-1">Expected Daily Earnings</div>
      </div>
    </div>

    ${r.finalTotal > 24
      ? `<div class="mt-2 p-3 bg-yellow-100 rounded-lg text-yellow-900 text-center font-semibold">
           You unlocked the higher rate: ₹40 per point!
         </div>`
      : ""}

    <button id="download" class="mt-6 w-full bg-green-600 text-white p-3 rounded-lg font-semibold">
      Download Plan as Image
    </button>

    ${disclaimerHTML()}
  `);

  qs("#back").onclick = showInputView;

  qs("#download").onclick = () => {
    html2canvas(qs("#content"), { scale: 2 }).then(canvas => {
      const link = document.createElement("a");
      link.download = "jss_daily_plan.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  };
}

/* ------------------ INIT ------------------ */
window.onload = () => {
  localStorage.removeItem("jss_id");
  localStorage.removeItem("jss_name");
  showLoginView();
};
