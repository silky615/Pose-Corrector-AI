import React, { useState } from "react";
import LogoHeader from "./LogoHeader";
import * as api from "../api";

export default function SignUp({ onNavigate }) {
  const [form, setForm] = useState({
    fullname: "",
    username: "",
    useEmailAsUsername: true,
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
    if (!form.useEmailAsUsername && !form.username.trim()) return "Enter a username or check 'Use email as username'";
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);

    const parts = form.fullname.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    const payload = {
      firstName,
      lastName,
      email: form.email,
      password: form.password,
      age: form.age ? Number(form.age) : undefined,
      height: form.height ? Number(form.height) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
    };

    try {
      const data = await api.signup(payload);
      const displayName = form.useEmailAsUsername ? form.email : form.username.trim();
      localStorage.setItem("pc_demo_email", form.email);
      localStorage.setItem("pc_demo_user_id", String(data.user_id));
      localStorage.setItem("pc_demo_username", data.name || displayName);
      setForm({ fullname: "", username: "", useEmailAsUsername: true, age: "", email: "", height: "", weight: "", password: "" });
      onNavigate("signin");
    } catch (err) {
      setError(err.message || "Sign up failed");
    }
  }

  return (
    <div className="center-wrap">
      <LogoHeader />
      <div className="card form-card wide">
        <h2>Create Account</h2>
        <form onSubmit={submit} className="form grid">
          <label>
            Full name
            <input
              type="text"
              value={form.fullname}
              onChange={(e) => update("fullname", e.target.value)}
              placeholder="Jane Doe"
            />
          </label>

          <div className="form-fullwidth">
            <label className="row-inline">
              <input
                type="checkbox"
                checked={form.useEmailAsUsername}
                onChange={(e) => update("useEmailAsUsername", e.target.checked)}
              />
              <span>Use email as username</span>
            </label>
          </div>

          {!form.useEmailAsUsername && (
            <label>
              Username
              <input
                type="text"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="johndoe"
              />
            </label>
          )}

          <label>
            Age
            <input
              type="number"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              min="1"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Height (cm)
            <input
              type="number"
              value={form.height}
              onChange={(e) => update("height", e.target.value)}
              min="1"
            />
          </label>

          <label>
            Weight (kg)
            <input
              type="number"
              value={form.weight}
              onChange={(e) => update("weight", e.target.value)}
              min="1"
            />
          </label>

          <label>
            Create password
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="button-row fullwidth">
            <button className="btn primary" type="submit">Create Account</button>
            <button type="button" className="btn ghost" onClick={() => onNavigate("index")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
