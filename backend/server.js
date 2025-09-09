// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Habit = require("./models/Habit");

const app = express();
app.use(cors());
app.use(express.json());

// Mongo connection
mongoose.connect("mongodb://mongo:27017/habits", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo connect error:", err));

/* ---------------- helpers ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const isoKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // month m is 0-based

function monthBoundsFor(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return { first, last, daysInMonth: last.getDate(), year, month };
}

function getStatusValue(statusMap, iso) {
  if (!statusMap) return undefined;
  if (typeof statusMap.get === "function") return statusMap.get(iso);
  return statusMap[iso];
}

// progress for habit in given month/year
function computeProgressForMonth(habitDoc, year, month) {
  const now = new Date();
  const { first, last } = monthBoundsFor(year, month);
  const habitStart = new Date(habitDoc.startDate);

  const start = habitStart > last ? null : (habitStart > first ? new Date(habitStart) : new Date(first));
  const isViewingFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
  const end = isViewingFuture ? last : (now < last ? now : last);

  if (!start || end < start) return 0;

  let eligible = 0, done = 0;
  const d = new Date(start);
  while (d <= end) {
    const key = isoKey(d.getFullYear(), d.getMonth(), d.getDate());
    eligible += 1;
    const val = getStatusValue(habitDoc.status, key);
    if (val === "done") done += 1;
    d.setDate(d.getDate() + 1);
  }
  return Math.round((done / Math.max(eligible, 1)) * 100);
}

// streak: consecutive done days ending today, not before habit.startDate
function computeStreak(habitDoc) {
  const today = new Date();
  let streak = 0;
  const habitStart = new Date(habitDoc.startDate);
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (true) {
    if (d < habitStart) break;
    const key = isoKey(d.getFullYear(), d.getMonth(), d.getDate());
    const val = getStatusValue(habitDoc.status, key);
    if (val === "done") {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

/* ---------------- API ---------------- */

// health
app.get("/health", (_, res) => res.json({ ok: true }));

// GET /habits?year=YYYY&month=0-based
app.get("/habits", async (req, res) => {
  try {
    const qYear = parseInt(req.query.year, 10);
    const qMonth = parseInt(req.query.month, 10);
    const now = new Date();
    const year = Number.isInteger(qYear) ? qYear : now.getFullYear();
    const month = Number.isInteger(qMonth) ? qMonth : now.getMonth();

    const { daysInMonth } = monthBoundsFor(year, month);
    const docs = await Habit.find().exec();

    const habits = docs.map(doc => {
      const habitStart = new Date(doc.startDate);
      const statusForDay = {}; // keys "1".."daysInMonth"
      const today = new Date();
      const dateOnlyToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      for (let d = 1; d <= daysInMonth; d++) {
        const cur = new Date(year, month, d);
        const iso = isoKey(year, month, d);

        if (cur < new Date(habitStart.getFullYear(), habitStart.getMonth(), habitStart.getDate())) {
          statusForDay[String(d)] = "disabled";
          continue;
        }

        const explicit = getStatusValue(doc.status, iso);
        if (explicit === "done") statusForDay[String(d)] = "done";
        else if (explicit === "missed") statusForDay[String(d)] = "missed";
        else {
          if (cur.getTime() === dateOnlyToday.getTime()) statusForDay[String(d)] = "today";
          else if (cur < dateOnlyToday) statusForDay[String(d)] = "missed";
          else statusForDay[String(d)] = "future";
        }
      }

      const progress = computeProgressForMonth(doc, year, month);
      const streak = computeStreak(doc);

      return {
        _id: doc._id,
        name: doc.name,
        goal: doc.goal || "",
        startDate: doc.startDate,
        startDay: doc.startDate.getDate(),
        days: statusForDay,
        progress,
        streak
      };
    });

    res.json({ year, month, daysInMonth, habits });
  } catch (err) {
    console.error("GET /habits error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /habits { name, startDay, year?, month?, goal? }
app.post("/habits", async (req, res) => {
  try {
    const { name, startDay, year, month, goal } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });

    const now = new Date();
    const useYear = Number.isInteger(year) ? year : now.getFullYear();
    const useMonth = Number.isInteger(month) ? month : now.getMonth();
    const { daysInMonth } = monthBoundsFor(useYear, useMonth);

    const day = Math.min(Math.max(parseInt(startDay || "1", 10), 1), daysInMonth);
    const startDate = new Date(useYear, useMonth, day);

    const habit = new Habit({ name, startDate, goal: goal || "" });
    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error("POST /habits error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /habits/:id/mark { date: "YYYY-MM-DD", done: true|false }
app.post("/habits/:id/mark", async (req, res) => {
  try {
    const { date, done } = req.body || {};
    if (!date) return res.status(400).json({ error: "date is required" });

    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ error: "not found" });

    habit.status.set(date, done ? "done" : "missed");
    await habit.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /habits/:id/mark error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /habits/:id
app.delete("/habits/:id", async (req, res) => {
  try {
    const result = await Habit.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /habits/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* optionally load notifier if env set */
try {
  if (process.env.USER_EMAIL && process.env.USER_PASS) {
    require("./notify");
    console.log("Email notifier loaded");
  }
} catch (e) {
  console.error("Failed to start notifier:", e);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
