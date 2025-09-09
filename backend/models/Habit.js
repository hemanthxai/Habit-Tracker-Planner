// backend/models/Habit.js
const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true }, // full date (year/month/day) representing start
  goal: { type: String, default: "" },
  status: { type: Map, of: String, default: {} } // keys: "YYYY-MM-DD" -> "done" | "missed"
}, { timestamps: true });

module.exports = mongoose.model("Habit", habitSchema);
