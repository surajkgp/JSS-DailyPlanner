/* ---------------------------------------------------
   JSS DAILY PLANNER — FIXED VERSION FOR GITHUB PAGES
   ✔ Firebase Works
   ✔ UI Loads
   ✔ No Dynamic Imports
---------------------------------------------------- */

///////////////////////////////////////////////////////
// STATE
///////////////////////////////////////////////////////
let appState = {
    userId: null,
    remainingDays: 0,
    cycleDisplay: "",
    startDate: null,
    endDate: null,
    calculation: null
};

///////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////
const qs = (s) => document.querySelector(s);
const html = (s, h) => qs(s).innerHTML = h;

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

    const sDate = new Date(y, m, start);
    const eDate = new Date(y, m, end);

    return { start, end, sDate, eDate };
}

///////////////////////////////////////////////////////
// CALCULATIONS
///////////////////////////////////////////////////////
function calculateTotalPoints(target, days) {
    if (days <= 0) return { totalPoints: 0, rate: 20 };

    const solve = (T, rate, d, bonus) => (T - d * bonus) / rate;

    let P1 = solve(target, 40, days, 100);
    if (P1 > 24 && P1 / days >= 3) return { totalPoints: Math.ceil(P1), rate: 40 };

    let P2 = solve(target, 40, days, 0);
    if (P2 > 24) return { totalPoints: Math.ceil(P2), rate: 40 };

    let P3 = solve(target, 20, days, 100);
    if (P3 <= 24 && P3 / days >= 3) return { totalPoints: Math.ceil(P3), rate: 20 };

    let P4 = solve(target, 20, days, 0);
    if (P4 <= 24) return { totalPoints: Math.ceil(P4), rate: 20 };

    let Pf = solve(target, 40, days, 0);
    return { totalPoints: Math.ceil(Pf), rate: 40 };
}

function distributePoints(total, days) {
    if (days <= 0) return [];
    const base = Math.ceil(total / days);
    let arr = Array(days).fill(base);
    let diff = (base * days) - total;

    for (let i = 0; i < diff; i++) arr[i] -= 1;
    return arr;
}

function earningFor(points, rate) {
    return (points * rate) + (points >= 3 ? 100 : 0);
}

///////////////////////////////////////////////////////
// FIREBASE INIT — FIXED (NO DYNAMIC IMPORTS)
///////////////////////////////////////////////////////
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

async function initFirebase() {
    const app = initializeApp(window.__firebase_config);
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            appState.userId = user.uid;
            showInputView();
        } else {
            signInAnonymously(auth);
        }
    });
}

///////////////////////////////////////////////////////
// VIEW 1 — INPUT SCREEN
///////////////////////////////////////////////////////
function showInputView() {
    const today = new Date();
    const c = getPayCycle(today);
    appState.remainingDays = c.end - today.getDate() + 1;

    const fmt = (d) => d.toLocaleDateString('en-IN', { month: "short", day: "numeric" });
    appState.cycleDisplay = fmt(c.sDate) + " - " + fmt(c.eDate);

    html("#content", `
        <h1 class="text-2xl font-bold mb-2 text-indigo-700">JSS Daily Planner</h1>
        <p class="text-xs text-gray-500 mb-4">Your personalised earning plan for this cycle.</p>

        <div class="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-center mb-4">
            <p class="text-sm font-semibold text-indigo-700">Pay Cycle</p>
            <p class="text-lg font-bold">${appState.cycleDisplay}</p>
        </div>

        <form id="calcForm" class="space-y-4">
            <div>
                <label class="text-sm font-semibold">Weekly Target (₹)</label>
                <input id="target" class="w-full p-3 border rounded mt-1" placeholder="e.g., 5000">
            </div>

            <div>
                <label class="text-sm font-semibold">Available Days</label>
                <input id="days" class="w-full p-3 border rounded mt-1" placeholder="Max: ${appState.remainingDays}">
                <p class="text-xs text-gray-500">Remaining days this cycle: ${appState.remainingDays}</p>
            </div>

            <button class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold">
                Find My Daily Target
            </button>
        </form>
    `);

    qs("#calcForm").onsubmit = (e) => {
        e.preventDefault();

        let target = parseInt(qs("#target").value);
        let days = parseInt(qs("#days").value);

        if (!target || !days) return alert("Please enter valid numbers.");
        if (days > appState.remainingDays)
            return alert("Cannot exceed remaining cycle days.");

        let { totalPoints, rate } = calculateTotalPoints(target, days);

        appState.calculation = {
            target,
            days,
            totalPoints,
            rate,
            dailyPoints: distributePoints(totalPoints, days)
        };

        showResultsView();
    };
}

///////////////////////////////////////////////////////
// VIEW 2 — RESULTS
///////////////////////////////////////////////////////
function showResultsView() {
    const r = appState.calculation;

    const avgDaily = Math.ceil(r.totalPoints / r.days);
    const earning = earningFor(avgDaily, r.rate);

    html("#content", `
        <button id="back" class="text-indigo-600 mb-4">← Edit</button>

        <h2 class="text-xl font-bold mb-4">Your Daily Plan</h2>

        <div class="p-4 bg-gray-50 border rounded-lg mb-4">
            <p class="flex justify-between"><span>Daily Target:</span><strong>${avgDaily} points</strong></p>
            <p class="flex justify-between"><span>Rate:</span><strong>₹${r.rate}/point</strong></p>
            <p class="flex justify-between"><span>Total Points:</span><strong>${r.totalPoints}</strong></p>
            <p class="flex justify-between"><span>Earning Per Day:</span><strong>₹${earning}</strong></p>
        </div>

        ${r.totalPoints > 24 ? `
            <div class="p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-900 font-semibold mb-4">
                ⭐ You have unlocked ₹40 per point this week!
            </div>
        ` : ""}

        <button id="download" class="w-full bg-green-600 text-white p-3 rounded-lg font-semibold">
            Download as Image
        </button>
    `);

    qs("#back").onclick = showInputView;

    qs("#download").onclick = () => {
        html2canvas(qs("#content"), { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = "jss_daily_plan.png";
            link.href = canvas.toDataURL();
            link.click();
        });
    };
}

///////////////////////////////////////////////////////
// START APP
///////////////////////////////////////////////////////
initFirebase();
