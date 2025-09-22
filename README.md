# Habit Tracker Planner

Habit Tracker Planner is a **full-stack productivity app** to help users track, plan, and maintain daily habits.  
It includes a **frontend UI** and a **backend API**, containerized with Docker for easy setup.


## 🧱 Tech Stack

- **Frontend**: React (Vite)  
- **Backend**: Node.js + Express  
- **Database**: MongoDB (via backend)  
- **Containerization**: Docker & Docker Compose  

## 📂 Repository Structure

Habit-Tracker-Planner/
├── backend/ # API server (Node.js + Express)
├── frontend/ # Web UI (React)
├── docs/ # Documentation site
├── docker-compose.yml # Compose for local dev
└── README.md # Project overview

## 🚀 Getting Started (Local Development)

## 1. Clone the repository

git clone https://github.com/hemanthxai/Habit-Tracker-Planner.git
cd Habit-Tracker-Planner

## 2. Setup environment variables
Copy .env.example files in frontend and backend, then configure as needed.
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

## 3. Start services with Docker
docker-compose up --build

## 4. Access the app
Frontend → http://localhost:3000

Backend API → http://localhost:5000/api


## 🧪 Running Tests

cd backend && npm test
cd frontend && npm test


## 📦 Deployment

GitHub Pages hosts documentation (/docs folder).

For production app deployment, you can use:

Docker on VPS/Cloud

Services like Render, Railway, or Heroku


## 🤝 Contributing

Fork the repo

Create a new branch (git checkout -b feature-name)

Commit changes (git commit -m "feat: new feature")

Push & open a Pull Request
