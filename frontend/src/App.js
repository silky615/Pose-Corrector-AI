import React, { useState, useEffect } from "react";
import "./index.css";

function LogoHeader() {
  return (
    <header className="logo-header">
      <div className="logo-badge">PC</div>
      <div>
        <h1 className="project-title">Pose Corrector AI</h1>
        <p className="project-sub">Exercise form feedback — smarter, safer, stronger!</p>
      </div>
    </header>
  );
}

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


function SignIn({ onNavigate }) {
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

    alert(`Signed in as ${email} (demo)`);
    // in real app: redirect to dashboard / set auth state
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

function SignUp({ onNavigate }) {
  const [form, setForm] = useState({
    fullname: "",
    age: "",
    email: "",
    height: "",
    weight: "",
    password: ""
  });
  const [error, setError] = useState("");

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function validate() {
    if (!form.fullname.trim()) return "Full name is required";
    if (!form.age || Number(form.age) <= 0) return "Enter a valid age";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(form.email)) return "Enter a valid email";
    if (!form.height || Number(form.height) <= 0) return "Enter a valid height (cm)";
    if (!form.weight || Number(form.weight) <= 0) return "Enter a valid weight (kg)";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    return "";
  }

  function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);

    // demo: show collected info and clear password
    const safe = { ...form, password: "••••••" };
    console.log("Signup payload (demo):", form);
    alert(`Account created for ${form.fullname} (demo). Check console for payload.`);
    setForm({ fullname: "", age: "", email: "", height: "", weight: "", password: "" });
    onNavigate("signin");
  }

  return (
    <div className="center-wrap">
      <LogoHeader />
      <div className="card form-card wide">
        <h2>Create Account</h2>
        <form onSubmit={submit} className="form grid">

          <label>
            First name
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Jane"
              required
            />
          </label>

          <label>
            Last name <span className="muted-small"></span>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Doe"
            />
          </label>

          <label>
            Age
            <input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} min="1" />
          </label>

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>

          <label>
            Height (cm)
            <input type="number" value={form.height} onChange={(e) => update("height", e.target.value)} />
          </label>

          <label>
            Weight (kg)
            <input type="number" value={form.weight} onChange={(e) => update("weight", e.target.value)} />
          </label>

          <label>
            Create password
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="button-row fullwidth">
            <button className="btn primary" type="submit">Create Account</button>
            <button type="button" className="btn ghost" onClick={() => onNavigate("index")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("index");

  useEffect(() => {
    // optional: simple 'routing' from url hash
    const handler = () => {
      const h = window.location.hash.replace("#", "");
      if (h) setRoute(h);
    };
    window.addEventListener("hashchange", handler);
    handler();
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  function navigate(to) {
    setRoute(to);
    window.location.hash = to; // keeps basic back/forward
  }

  return (
    <div className="app-bg">
      {route === "index" && <IndexPage onNavigate={navigate} />}
      {route === "signin" && <SignIn onNavigate={navigate} />}
      {route === "signup" && <SignUp onNavigate={navigate} />}
      <footer className="footer">© {new Date().getFullYear()} Pose Corrector AI</footer>
    </div>
  );
}
