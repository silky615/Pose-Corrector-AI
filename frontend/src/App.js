import React, { useState, useEffect } from "react";
import "./index.css";
import LogoHeader from "./components/LogoHeader";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import ExerciseLanding from "./components/ExerciseLanding";
import ExercisePage from "./components/ExercisePage";
import ProfilePage from "./components/ProfilePage";
import ResetPassword from "./components/ResetPassword";

function IndexPage({ onNavigate }) {
  return (
    <div className="center-wrap">
      <LogoHeader />
      <div className="card hero-card">
        <h2>Welcome to Pose Corrector AI</h2>
        <p className="muted">Choose an option to get started</p>

        <div className="button-row">
          <button className="btn primary" onClick={() => onNavigate("signin")}>
            Sign In
          </button>
          <button className="btn outline" onClick={() => onNavigate("signup")}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("index");
  const [exerciseSlug, setExerciseSlug] = useState(null);

  useEffect(() => {
    const handler = () => {
      let h = (window.location.hash || "").replace(/^#\/?/, "").trim();
      // Strip any query string for routing (e.g. reset-password?uid=...)
      const path = h.split("?")[0];
      if (h.startsWith("exercise-")) {
        setRoute("exercise");
        setExerciseSlug(h.replace("exercise-", ""));
      } else {
        setRoute(path || "index");
        setExerciseSlug(null);
      }
    };
    window.addEventListener("hashchange", handler);
    handler();
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  function navigate(to) {
    if (to.startsWith("exercise-")) {
      setRoute("exercise");
      setExerciseSlug(to.replace("exercise-", ""));
    } else {
      setRoute(to);
      setExerciseSlug(null);
    }
    window.location.hash = to;
  }

  const isDashboardLayout = route === "dashboard" || route === "exercise" || route === "profile";

  return (
    <div className={`app-bg${isDashboardLayout ? " app-bg-dashboard" : ""}`}>
      {route === "index" && <IndexPage onNavigate={navigate} />}
      {route === "signin" && <SignIn onNavigate={navigate} />}
      {route === "signup" && <SignUp onNavigate={navigate} />}
      {route === "reset-password" && <ResetPassword onNavigate={navigate} />}
      {route === "dashboard" && <ExerciseLanding onNavigate={navigate} />}
      {route === "profile" && <ProfilePage onNavigate={navigate} />}
      {route === "exercise" && exerciseSlug && (
        <ExercisePage exerciseId={exerciseSlug} onNavigate={navigate} />
      )}
      {!isDashboardLayout && (
        <footer className="footer">© {new Date().getFullYear()} Pose Corrector AI</footer>
      )}
    </div>
  );
}
