// frontend/script.js
// Assumes backend endpoints:
// GET  /habits?year=YYYY&month=0-based
// POST /habits { name, startDay, year, month, goal }
// POST /habits/:id/mark { date: "YYYY-MM-DD", done: true|false }
// DELETE /habits/:id

const API = "http://localhost:4000";
let selected = { date: new Date() };
let chartInstance = null;

function pad(n){ return String(n).padStart(2, '0'); }
function isoKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }

function setSelected(year, month) {
  selected.year = year;
  selected.month = month;
  selected.date = new Date(year, month, 1);
  document.getElementById("monthLabel").innerText = selected.date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

async function fetchAndRender() {
  try {
    const res = await fetch(`${API}/habits?year=${selected.year}&month=${selected.month}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderGrid(data);
    renderOverviewChart(data);
  } catch (err) {
    console.error("fetchAndRender error:", err);
    alert("Failed to fetch habits (see console). Is backend running on port 4000?");
  }
}

function renderGrid(data) {
  const daysInMonth = data.daysInMonth;
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  // Prepare an ordered habit list to render pills in same order
  const habits = data.habits || [];
  document.getElementById("avgProgress").innerText = `Avg: ${Math.round(habits.reduce((s,h)=>s+(h.progress||0),0)/Math.max(habits.length,1))}%`;
  document.getElementById("habCount").innerText = `${habits.length} habit${habits.length===1?'':'s'}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement("div");
    dayEl.className = "day";
    const dateTitle = document.createElement("div");
    dateTitle.className = "date";
    // show weekday abbreviation too
    const weekday = new Date(selected.year, selected.month, d).toLocaleString(undefined, { weekday: 'short' });
    dateTitle.innerText = `${d} • ${weekday}`;
    dayEl.appendChild(dateTitle);

    habits.forEach(h => {
      const pill = document.createElement("div");
      pill.className = "habit-pill";
      const state = h.days[String(d)]; // "done","missed","today","future","disabled"

      // ensure state class exists
      pill.classList.add(state || "future");

      const left = document.createElement("div");
      left.className = "pill-left";
      const nameSpan = document.createElement("div");
      nameSpan.className = "pill-name";
      nameSpan.innerText = h.name;
      const meta = document.createElement("div");
      meta.className = "pill-meta";
      meta.innerText = `${h.progress || 0}% • 🔥 ${h.streak || 0}`;

      left.appendChild(nameSpan);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "pill-right";

      const delBtn = document.createElement("button");
      delBtn.className = "pill-delete";
      delBtn.title = "Delete habit";
      delBtn.innerText = "🗑";
      delBtn.onclick = async (ev) => {
        ev.stopPropagation();
        if (!confirm(`Delete habit "${h.name}"?`)) return;
        await fetch(`${API}/habits/${h._id}`, { method: "DELETE" });
        fetchAndRender();
      };

      right.appendChild(delBtn);
      pill.appendChild(left);
      pill.appendChild(right);

      // clicking toggles done/missed (unless disabled)
      if (state !== "disabled") {
        pill.onclick = async () => {
          // compute iso key
          const iso = isoKey(selected.year, selected.month, d);
          const isDone = (state === "done");
          try {
            await fetch(`${API}/habits/${h._id}/mark`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: iso, done: !isDone })
            });
            // refresh UI
            fetchAndRender();
          } catch (err) {
            console.error("toggle mark error:", err);
            alert("Failed to update habit status");
          }
        };
      } else {
        // disabled - show tooltip
        pill.title = "This habit starts later than this day";
      }

      dayEl.appendChild(pill);
    });

    grid.appendChild(dayEl);
  }
}

function renderOverviewChart(data) {
  // compute totals
  let done = 0, missed = 0, pending = 0;
  (data.habits || []).forEach(h => {
    Object.values(h.days).forEach(v => {
      if (v === "done") done++;
      else if (v === "missed") missed++;
      else pending++;
    });
  });

  const ctx = document.getElementById("overviewChart").getContext("2d");
  const labels = ["Done","Missed","Pending"];
  const dataset = [done, missed, pending];

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: dataset,
        backgroundColor: ['#22c55e','#ef4444','#a78bfa']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      maintainAspectRatio: false
    }
  });
}

/* controls */
function attachControls() {
  document.getElementById("prevMonth").onclick = () => {
    const d = new Date(selected.year, selected.month - 1, 1);
    setSelected(d.getFullYear(), d.getMonth());
    fetchAndRender();
  };
  document.getElementById("nextMonth").onclick = () => {
    const d = new Date(selected.year, selected.month + 1, 1);
    setSelected(d.getFullYear(), d.getMonth());
    fetchAndRender();
  };

  document.getElementById("addHabitBtn").onclick = async () => {
    const name = document.getElementById("habitName").value.trim();
    const startDayRaw = document.getElementById("startDay").value;
    const goal = document.getElementById("goal").value.trim();
    if (!name) return alert("Please enter a habit name");
    const startDay = startDayRaw ? parseInt(startDayRaw, 10) : 1;

    try {
      await fetch(`${API}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDay, year: selected.year, month: selected.month, goal })
      });
      document.getElementById("habitName").value = "";
      document.getElementById("startDay").value = "";
      document.getElementById("goal").value = "";
      fetchAndRender();
    } catch (err) {
      console.error("add habit error:", err);
      alert("Failed to add habit");
    }
  };
}

/* init */
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  setSelected(now.getFullYear(), now.getMonth());
  attachControls();
  fetchAndRender();
});
