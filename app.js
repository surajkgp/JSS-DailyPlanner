/* ---------------------------------------------------
   JSS DAILY PLANNER — FINAL VERSION
   - Login with 8-digit ID starting with 66
   - Input weekly target, points earned, available days
   - Mid-cycle recalculation
   - Cycle summary + KPI tiles
   - Download as image
---------------------------------------------------- */

///////////////////////////////////////////////////////
// STATE
///////////////////////////////////////////////////////
let appState = {
    cycle: null,
};

///////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////
const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

///////////////////////////////////////////////////////
// PAY CYCLE LOGIC
///////////////////////////////////////////////////////
function getPayCycle(today) {
    const d = today.getDate();
    const m = today.getMonth();
    const y = today.getFullYear();

    let start, end;
    if (d <= 7) { start = 1; end = 7; }
    else if (d <= 14) { start = 8; end = 14; }
    else if (d <= 21) { start = 15; end = 21; }
    else { start = 22; end = new Date(y, m + 1, 0).getDate(); }

    return {
        start,
        end,
        sDate: new Date(y, m, start),
        eDate: new Date(y, m, end)
    };
}

///////////////////////////////////////////////////////
// CALCULATIONS
///////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////
// LOGIN PAGE
///////////////////////////////////////////////////////
function showLoginView() {
    html("#content", `
        <h1 class="text-2xl font-bold text-indigo-700 mb-4">JSS Login</h1>

        <label class="text-sm font-semibold">8-Digit JSS ID</label>
        <input id="loginId" maxlength="8" inputmode="numeric"
               class="w-full p-3 border rounded-lg mt-1 mb-4" placeholder="66123456">

        <label class="text-sm font-semibold">Name (Optional)</label>
        <input id="loginName" class="w-full p-3 border rounded-lg mt-1 mb-4" placeholder="Your name">

        <button id="loginBtn"
            class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
            Login
        </button>

        <p id="loginError" class="text-red-600 text-sm mt-3 hidden">
            ❌ Enter 8-digit ID starting with 66.
        </p>
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

///////////////////////////////////////////////////////
// INPUT PAGE
///////////////////////////////////////////////////////
function showInputView() {
    if (!localStorage.getItem("jss_id")) return showLoginView();

    const today = new Date();
    let cycle = getPayCycle(today);
    appState.cycle = cycle;

    const remainingDays = cycle.end - today.getDate() + 1;
    const fmt = (d) => d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric"
    });

    html("#content", `
        <h1 class="text-2xl font-bold text-indigo-700 mb-1">JSS Daily Planner</h1>
        <p class="text-xs text-gray-500 mb-4">Recalculate your mid-cycle target based on progress.</p>

        <div class="p-3 bg-indigo-50 border rounded-lg mb-4 text-center">
            <div class="text-sm font-semibold text-indigo-700">Pay Cycle</div>
            <div class="text-lg font-bold">${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}</div>
        </div>

        <form id="calcForm" class="space-y-4">
            <div>
                <label class="text-sm font-semibold">Weekly Target (₹)</label>
                <input id="target" type="number" class="w-full p-3 border rounded mt-1" placeholder="5000">
            </div>

            <div>
                <label class="text-sm font-semibold">Points Earned Till Today</label>
                <input id="earned" type="number" class="w-full p-3 border rounded mt-1" placeholder="10">
            </div>

            <div>
                <label class="text-sm font-semibold">Available Days</label>
                <input id="days" type="number" class="w-full p-3 border rounded mt-1" placeholder="Max: ${remainingDays}">
                <p class="text-xs text-gray-500">Remaining days: ${remainingDays}</p>
            </div>

            <button class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
                Find My Daily Target
            </button>
        </form>
    `);

    qs("#calcForm").onsubmit = (e) => {
        e.preventDefault();

        const target = parseInt(qs("#target").value);
        const earned = parseInt(qs("#earned").value) || 0;
        const days = parseInt(qs("#days").value);

        if (!target || !days) return alert("Enter valid numbers.");
        if (days > remainingDays) return alert("Days exceed remaining cycle.");

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

///////////////////////////////////////////////////////
// RESULTS PAGE
///////////////////////////////////////////////////////
function showResultsPage(r) {
    html("#content", `
        <button id="back" class="text-indigo-600 mb-4">← Edit</button>

        <h2 class="text-xl font-bold mb-4">Your Updated Plan</h2>

        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-4">
            <h3 class="text-lg font-bold text-indigo-800 mb-2">Cycle Summary & Progress</h3>

            <p class="flex justify-between text-sm text-gray-700">
                <span>Total Points Target</span><strong>${r.requiredPoints}</strong>
            </p>

            <p class="flex justify-between text-sm text-gray-700">
                <span>Points Earned</span><strong>${r.earned}</strong>
            </p>

            <p class="flex justify-between text-sm text-gray-700">
                <span>Remaining Points</span><strong>${r.remainingPoints}</strong>
            </p>

            <p class="flex justify-between text-sm text-indigo-900 font-semibold border-t pt-2 mt-2">
                <span>Final Total Points</span><strong>${r.finalTotal}</strong>
            </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-4 bg-white border rounded-xl shadow text-center">
                <div class="text-4xl font-extrabold text-indigo-700">${r.daily}</div>
                <div class="text-sm text-gray-600 mt-1">Daily Target</div>
            </div>

            <div class="p-4 bg-white border rounded-xl shadow text-center">
                <div class="text-4xl font-extrabold text-green-700">₹${r.dailyEarn}</div>
                <div class="text-sm text-gray-600 mt-1">Daily Earning</div>
            </div>
        </div>

        ${r.finalTotal > 24 ? `
            <div class="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-900 text-center font-semibold">
                ⭐ You unlocked ₹40 per point!
            </div>
        ` : ""}

        <button id="download"
                class="mt-6 w-full bg-green-600 text-white p-3 rounded-lg font-semibold">
            Download as Image
        </button>
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

///////////////////////////////////////////////////////
// INIT APP
///////////////////////////////////////////////////////
window.onload = () => {
    if (!localStorage.getItem("jss_id")) showLoginView();
    else showInputView();
};
