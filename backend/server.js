const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Habit = require("./models/Habit");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect("mongodb://mongo:27017/habits", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Get all habits
app.get("/habits", async (req, res) => {
  const habits = await Habit.find();
  res.json(habits);
});

// Add a new habit
app.post("/habits", async (req, res) => {
  const habit = new Habit({ name: req.body.name, days: {} });
  await habit.save();
  res.json(habit);
});

// Mark a habit for a day
app.post("/habits/:id/mark", async (req, res) => {
  const { date, done } = req.body;
  const habit = await Habit.findById(req.params.id);
  habit.days.set(date, done);
  await habit.save();
  res.json(habit);
});

app.listen(4000, () => console.log("Backend running on port 4000"));
