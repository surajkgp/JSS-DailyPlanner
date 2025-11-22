/* ---------------------------------------------
   JSS DAILY PLANNER — Final Clean Version
   - PRM Pill above Pay Cycle Box (Option A)
   - Payout Cycle Summary text
   - Responsive layout
   - No header image
   - Highlighted tiles, no animation fade
   - Full login enforcement
------------------------------------------------ */

const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

/* ----------------------------------------------------
   PAY CYCLE LOGIC
---------------------------------------------------- */
function getPayCycle(today) {
  const d = today.getDate(), m = today.getMonth(), y = today.getFullYear();
  let start, end;

  if (d <= 7) { start = 1; end = 7; }
  else if (d <= 14) { start = 8; end = 14; }
  else if (d <= 21) { start = 15; end = 21; }
  else { start = 22; end = new Date(y, m + 1, 0).getDate(); }

  return { start, end, sDate: new Date(y,m,start), eDate: new Date(y,m,end) };
}

/* ----------------------------------------------------
   POINT + EARNING CALCULATION
---------------------------------------------------- */
function calculatePoints(target, days) {
  if (days <= 0) return { points: 0, rate: 20 };
  const solve = (T, rate, d, bonus) => (T - d * bonus) / rate;

  let a = solve(target, 40, days, 100);
  if (a > 24 && a/days >= 3) return { points: Math.ceil(a), rate: 40 };

  let b = solve(target, 40, days, 0);
  if (b > 24) return { points: Math.ceil(b), rate: 40 };

  let c = solve(target, 20, days, 100);
  if (c <= 24 && c/days >= 3) return { points: Math.ceil(c), rate: 20 };

  let d2 = solve(target, 20, days, 0);
  if (d2 <= 24) return { points: Math.ceil(d2), rate: 20 };

  let fallback = solve(target, 40, days, 0);
  return { points: Math.ceil(fallback), rate: 40 };
}

function earning(points, rate) {
  return (points * rate) + (points >= 3 ? 100 : 0);
}

/* ----------------------------------------------------
   LOGIN PAGE
---------------------------------------------------- */
function showLoginView() {
  html("#content", `
    <div class="p-6">

      <h1 class="text-center text-2xl font-extrabold text-indigo-700">
        JSS Daily Planner
      </h1>
      <p class="text-center text-sm text-gray-500 mb-6">
        Your personalised planner for the pay cycle.
      </p>

      <div class="p-5 bg-white rounded-xl shadow-sm border">

        <label class="text-sm font-medium">PRM ID</label>
        <input id="loginId" maxlength="8" inputmode="numeric"
          class="w-full mt-2 p-3 border rounded-lg mb-4"
          placeholder="66xxxxxx">

        <label class="text-sm font-medium">Your Name (Optional)</label>
        <input id="loginName"
          class="w-full mt-2 p-3 border rounded-lg mb-4"
          placeholder="e.g - Shyam">

        <button id="loginBtn"
          class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
          Continue
        </button>

        <p id="loginError" class="mt-3 text-sm text-red-600 hidden">
          Please enter a valid 8-digit ID starting with 66.
        </p>
      </div>

    </div>
  `);

  qs("#loginBtn").onclick = () => {
    const id = qs("#loginId").value.trim();
    const valid = /^66\d{6}$/.test(id);

    if (!valid) {
      qs("#loginError").classList.remove("hidden");
      return;
    }

    localStorage.setItem("jss_id", id);
    localStorage.setItem("jss_name", qs("#loginName").value.trim());
    showInputView();
  };
}

/* ----------------------------------------------------
   INPUT PAGE
---------------------------------------------------- */
function showInputView() {
  if (!localStorage.getItem("jss_id")) return showLoginView();

  const today = new Date();
  const cycle = getPayCycle(today);
  const remaining = cycle.end - today.getDate() + 1;
  const daysOld = today.getDate() - cycle.start; // points earned days

  const fmt = (d) =>
    d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  html("#content", `
    <div class="p-6">

      <h1 class="text-center text-2xl font-extrabold text-indigo-700">
        JSS Daily Planner
      </h1>
      <p class="text-center text-sm text-gray-500 mb-4">
        Enter your goal. Get your daily target instantly.
      </p>

      <!-- PRM Info Pill -->
      <div class="mx-auto mb-4 text-center w-full">
        <div class="inline-flex items-center gap-6 px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
          <span>PRM ID: ${localStorage.getItem("jss_id")}</span>
          <span>|</span>
          <span>Name: ${localStorage.getItem("jss_name") || "—"}</span>
        </div>
      </div>

      <!-- Pay Cycle Box -->
      <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center mb-4">
        <p class="text-sm font-semibold text-indigo-700">Your Pay Cycle</p>
        <p class="text-lg font-extrabold text-gray-800">
          ${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}
        </p>
      </div>

      <form id="calcForm" class="space-y-4">

        <div>
          <label class="text-sm font-medium">Earning Goal (₹)</label>
          <input id="target" type="number"
            class="w-full p-3 border rounded-lg mt-2"
            placeholder="e.g. 5000">
        </div>

        <div>
          <label class="text-sm font-medium">Points Earned (Last ${daysOld} Days)</label>
          <input id="earned" type="number"
            class="w-full p-3 border rounded-lg mt-2"
            ${daysOld === 0 ? 'disabled class="opacity-40 cursor-not-allowed w-full p-3 border rounded-lg mt-2"' : ''}
            placeholder="${daysOld === 0 ? 'No past days yet' : 'e.g - 20'}">
        </div>

        <div>
          <label class="text-sm font-medium">Available Days</label>
          <input id="days" type="number"
            class="w-full p-3 border rounded-lg mt-2"
            placeholder="Max: ${remaining}">
          <p class="text-xs text-gray-500 mt-2">
            You have ${remaining} days left in this cycle.
          </p>
        </div>

        <button
          class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
          Calculate My Daily Target
        </button>

      </form>

      <p class="text-center text-xs text-gray-400 mt-6">
        Note: This planner helps you estimate your daily points. Actual earnings may differ.
      </p>
    </div>
  `);

  qs("#calcForm").onsubmit = (e) => {
    e.preventDefault();
    const t = parseInt(qs("#target").value);
    const earned = parseInt(qs("#earned").value) || 0;
    const d = parseInt(qs("#days").value);

    if (!t || !d) return alert("Enter valid numbers.");
    if (d > remaining) return alert("Days exceed remaining cycle.");

    const { points: requiredPoints, rate: baseRate } = calculatePoints(t, d);

    const remainingPoints = Math.max(0, requiredPoints - earned);
    const finalTotal = earned + remainingPoints;
    const finalRate = finalTotal > 24 ? 40 : baseRate;
    const daily = Math.ceil(remainingPoints / d);
    const dailyEarn = earning(daily, finalRate);

    showResultsPage({
      daily,
      dailyEarn,
      requiredPoints,
      earned,
      remainingPoints,
      finalTotal
    });
  };
}

/* ----------------------------------------------------
   RESULTS PAGE
---------------------------------------------------- */
function showResultsPage(r) {
  if (!localStorage.getItem("jss_id")) return showLoginView();

  html("#content", `
    <div class="p-6">

      <!-- Back Button -->
      <button id="back" class="text-indigo-600 mb-4">← Back</button>

      <h2 class="text-center text-xl font-bold text-gray-800 mb-4">
        Your Daily Plan
      </h2>

      <!-- PRM Pill -->
      <div class="mx-auto mb-4 text-center w-full">
        <div class="inline-flex items-center gap-6 px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
          <span>PRM ID: ${localStorage.getItem("jss_id")}</span>
          <span>|</span>
          <span>Name: ${localStorage.getItem("jss_name") || "—"}</span>
        </div>
      </div>

      <!-- Paycycle Summary -->
      <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
        <div class="text-center text-sm font-semibold text-indigo-800 mb-3">
          Payout Cycle Summary
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>Total Points Needed</div><div class="text-right font-semibold">${r.requiredPoints}</div>
          <div>Points Completed</div><div class="text-right font-semibold">${r.earned}</div>
          <div>Points Still Required</div><div class="text-right font-semibold">${r.remainingPoints}</div>
        </div>
      </div>

      <!-- Tiles -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div class="p-5 bg-white rounded-lg text-center border border-indigo-200">
          <div class="text-4xl font-extrabold text-indigo-700">${r.daily}</div>
          <div class="text-sm text-gray-500 mt-1">Daily Target Points</div>
        </div>

        <div class="p-5 bg-white rounded-lg text-center border border-green-200">
          <div class="text-4xl font-extrabold text-green-700">₹${r.dailyEarn}</div>
          <div class="text-sm text-gray-500 mt-1">Expected Daily Earnings</div>
        </div>
      </div>

      ${r.finalTotal > 24 ? `
        <div class="mt-2 p-3 bg-yellow-100 rounded-lg text-yellow-900 text-center font-semibold">
          You unlocked the higher rate: ₹40 per point!
        </div>
      ` : ''}

      <button id="download"
        class="mt-6 w-full bg-green-600 text-white p-3 rounded-lg font-semibold">
        Download Plan as Image
      </button>

      <p class="text-center text-xs text-gray-400 mt-6">
        Note: This planner helps you estimate your daily points. Actual earnings may differ.
      </p>

    </div>
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

/* ----------------------------------------------------
   INIT — Always force login
---------------------------------------------------- */
window.onload = () => {
  localStorage.removeItem("jss_id");
  localStorage.removeItem("jss_name");
  showLoginView();
};
