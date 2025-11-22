/* ---------------------------------------------------
   JSS DAILY PLANNER — FINAL VERSION
   ✔ Strict Login (8-digit & starts with 66)
   ✔ Input Page
   ✔ Output Page (2 tiles only)
   ✔ GitHub Pages friendly (no Firebase)
---------------------------------------------------- */

///////////////////////////////////////////////////////
// UTILITIES
///////////////////////////////////////////////////////
const qs = (s) => document.querySelector(s);
const html = (s, h) => (qs(s).innerHTML = h);

///////////////////////////////////////////////////////
// LOGIN PAGE (STRICT VALIDATION)
///////////////////////////////////////////////////////
function showLoginView() {
    html("#content", `
        <h1 class="text-2xl font-bold text-indigo-700 mb-4">JSS Login</h1>

        <label class="text-sm font-semibold">8-Digit JSS ID</label>
        <input id="loginId" maxlength="8" inputmode="numeric"
            class="w-full p-3 border rounded-lg mt-1 mb-4" placeholder="66123456">

        <label class="text-sm font-semibold">Name (Optional)</label>
        <input id="loginName"
            class="w-full p-3 border rounded-lg mt-1 mb-4" placeholder="Your Name">

        <button id="loginBtn"
            class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">Login</button>

        <p id="loginError"
           class="text-red-600 text-sm mt-3 hidden">
           ❌ Invalid ID. Enter an 8-digit number starting with 66.
        </p>
    `);

    qs("#loginBtn").onclick = () => {
        const id = qs("#loginId").value.trim();
        const name = qs("#loginName").value.trim();

        if (!/^66\d{6}$/.test(id)) {
            qs("#loginError").classList.remove("hidden");
            return;
        }

        localStorage.setItem("jss_id", id);
        localStorage.setItem("jss_name", name);
        showInputView();
    };
}

///////////////////////////////////////////////////////
// PAY CYCLE LOGIC
///////////////////////////////////////////////////////
function getPayCycle(today) {
    const d = today.getDate();
    const m = today.getMonth();
    const y = today.getFullYear();

    let start, end;

    if (d <= 7)      { start = 1; end = 7; }
    else if (d <= 14){ start = 8; end = 14; }
    else if (d <= 21){ start = 15; end = 21; }
    else             { start = 22; end = new Date(y, m + 1, 0).getDate(); }

    return {
        start,
        end,
        sDate: new Date(y, m, start),
        eDate: new Date(y, m, end)
    };
}

///////////////////////////////////////////////////////
// CALCULATION LOGIC
///////////////////////////////////////////////////////
function calculatePoints(target, days) {
    const solve = (T, rate, d, bonus) => (T - d * bonus) / rate;

    let P1 = solve(target, 40, days, 100);
    if (P1 > 24) return { points: Math.ceil(P1), rate: 40 };

    let P2 = solve(target, 20, days, 100);
    if (P2 <= 24) return { points: Math.ceil(P2), rate: 20 };

    return { points: Math.ceil(P1), rate: 40 };
}

function earning(points, rate) {
    return (points * rate) + (points >= 3 ? 100 : 0);
}

///////////////////////////////////////////////////////
// INPUT PAGE
///////////////////////////////////////////////////////
function showInputView() {
    if (!localStorage.getItem("jss_id")) return showLoginView();

    const today = new Date();
    const cycle = getPayCycle(today);
    const remainingDays = cycle.end - today.getDate() + 1;

    const fmt = (d) =>
        d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    html("#content", `
        <h1 class="text-2xl font-bold text-indigo-700 mb-1">JSS Daily Planner</h1>
        <p class="text-xs text-gray-500 mb-4">Plan your weekly earnings.</p>

        <div class="p-3 bg-indigo-50 border rounded-lg mb-4 text-center">
            <div class="text-sm font-semibold text-indigo-700">Pay Cycle</div>
            <div class="text-lg font-bold">
                ${fmt(cycle.sDate)} – ${fmt(cycle.eDate)}
            </div>
        </div>

        <form id="calcForm" class="space-y-4">
            <div>
                <label class="text-sm font-semibold">Weekly Target (₹)</label>
                <input id="target" type="number"
                       class="w-full p-3 border rounded mt-1" placeholder="5000">
            </div>

            <div>
                <label class="text-sm font-semibold">Available Days</label>
                <input id="days" type="number"
                       class="w-full p-3 border rounded mt-1" placeholder="Max: ${remainingDays}">
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
        const days = parseInt(qs("#days").value);

        if (!target || !days) return alert("Enter valid numbers.");
        if (days > remainingDays) return alert("Cannot exceed remaining cycle days.");

        const { points, rate } = calculatePoints(target, days);
        const daily = Math.ceil(points / days);
        const dailyEarn = earning(daily, rate);

        showResultsPage(daily, dailyEarn, points);
    };
}

///////////////////////////////////////////////////////
// OUTPUT PAGE (2 TILES)
///////////////////////////////////////////////////////
function showResultsPage(dailyPoints, dailyEarning, totalPoints) {
    html("#content", `
        <button id="back" class="text-indigo-600 mb-4">← Edit</button>

        <h2 class="text-xl font-bold mb-4">Your Daily Plan</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div class="p-4 bg-white border rounded-xl shadow text-center">
                <div class="text-4xl font-extrabold text-indigo-700">${dailyPoints}</div>
                <div class="text-sm text-gray-600 mt-1">Daily Target (points)</div>
            </div>

            <div class="p-4 bg-white border rounded-xl shadow text-center">
                <div class="text-4xl font-extrabold text-green-700">₹${dailyEarning}</div>
                <div class="text-sm text-gray-600 mt-1">Daily Earning</div>
            </div>

        </div>

        ${totalPoints > 24 ? `
            <div class="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-900 text-center font-semibold">
                ⭐ You unlocked ₹40 per point!
            </div>` : ""}
    `);

    qs("#back").onclick = showInputView;
}

///////////////////////////////////////////////////////
// START APP
///////////////////////////////////////////////////////
window.onload = () => {
    if (localStorage.getItem("jss_id")) showInputView();
    else showLoginView();
};
