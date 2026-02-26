import React, { useState } from "react";
import { EXERCISES } from "../data/exercises";

export default function ExerciseLanding({ onNavigate }) {
  const displayName = useState(() =>
    localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || ""
  )[0];

  function handleSignOut() {
    localStorage.removeItem("pc_demo_email");
    localStorage.removeItem("pc_demo_username");
    onNavigate("index");
  }

  function handleSelect(exercise) {
    onNavigate(`exercise-${exercise.id}`);
  }

  const welcomeName = displayName ? (displayName.charAt(0).toUpperCase() + displayName.slice(1)) : "Guest";

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-logo">PC</span>
          <span className="dashboard-title">Pose Corrector AI</span>
        </div>
        <div className="dashboard-user">
          <span className="dashboard-username">👤 {welcomeName}</span>
          <button
            type="button"
            className="btn ghost btn-signout"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-hero">
          <h1 className="dashboard-welcome">Welcome back, {welcomeName}!</h1>
          <p className="dashboard-sub">Pick an exercise below to start your session.</p>
        </div>

        <div className="exercise-grid">
          {EXERCISES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="exercise-card"
              onClick={() => handleSelect(ex)}
            >
              <span className="exercise-emoji" role="img" aria-label={ex.name}>
                {ex.emoji}
              </span>
              <span className="exercise-name">{ex.name}</span>
              <span className="exercise-tag">{ex.short}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
