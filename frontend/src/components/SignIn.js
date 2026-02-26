import React, { useState, useEffect } from "react";
import LogoHeader from "./LogoHeader";

export default function SignIn({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("pc_demo_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  function validate() {
    if (!email.trim()) return "Email is required";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return "Enter a valid email";
    if (!password) return "Password is required";
    return "";
  }

  function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);

    // demo auth: accept password 'password123'
    if (password !== "password123") {
      return setError("Invalid credentials (demo). Try password123");
    }
    if (remember) localStorage.setItem("pc_demo_email", email);
    else localStorage.removeItem("pc_demo_email");
    // If no username stored (e.g. never signed up), show email as display name
    if (!localStorage.getItem("pc_demo_username")) localStorage.setItem("pc_demo_username", email);

    onNavigate("dashboard");
  }

  return (
    <div className="center-wrap">
      <LogoHeader />
      <div className="card form-card">
        <h2>Sign In</h2>
        <form onSubmit={submit} className="form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          <label className="row-inline">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          {error && <div className="error">{error}</div>}

          <div className="button-row">
            <button type="submit" className="btn primary">Sign In</button>
            <button type="button" className="btn ghost" onClick={() => onNavigate("index")}>
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
