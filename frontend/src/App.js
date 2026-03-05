import React, { useState, useEffect } from "react";
import "./index.css";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import ExerciseLanding from "./components/ExerciseLanding";
import ExercisePage from "./components/ExercisePage";

export default function App() {
  const [route, setRoute] = useState("signin");
  const [exerciseSlug, setExerciseSlug] = useState(null);

  useEffect(() => {
    const handler = () => {
      const h = (window.location.hash || "").replace("#", "");
      if (h.startsWith("exercise-")) {
        setRoute("exercise");
        setExerciseSlug(h.replace("exercise-", ""));
      } else {
        // default landing is signin now
        setRoute(h || "signin");
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

  const isDashboardLayout = route === "dashboard" || route === "exercise";
  const isAuthPage = route === "signin" || route === "signup";

  // Auth pages manage their own full-screen background — no wrapper needed
  if (isAuthPage) {
    return (
      <>
        {route === "signin" && <SignIn onNavigate={navigate} />}
        {route === "signup" && <SignUp onNavigate={navigate} />}
      </>
    );
  }

  return (
    <div className={`app-bg${isDashboardLayout ? " app-bg-dashboard" : ""}`}>
      {route === "dashboard" && <ExerciseLanding onNavigate={navigate} />}
      {route === "exercise" && exerciseSlug && (
        <ExercisePage exerciseId={exerciseSlug} onNavigate={navigate} />
      )}
      {!isDashboardLayout && (
        <footer className="footer">© {new Date().getFullYear()} Pose Corrector AI</footer>
      )}
    </div>
  );
}
