const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  name: String,
  days: { type: Map, of: Boolean }, // key = date (e.g., "2025-09-07"), value = true/false
});

module.exports = mongoose.model("Habit", habitSchema);
