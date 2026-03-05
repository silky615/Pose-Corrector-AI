import React, { useState } from "react";
import * as api from "../api";

const inputStyle = {
  width: "100%", padding: "12px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px", color: "white", fontSize: "14px",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "flex", flexDirection: "column", gap: "6px",
  fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)",
};

export default function SignUp({ onNavigate }) {
  const [form, setForm] = useState({
    fullname: "", age: "", email: "",
    height: "", weight: "", password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function update(k, v) { setForm(s => ({ ...s, [k]: v })); }

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

  async function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);

    const parts = form.fullname.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    const payload = {
      firstName, lastName,
      email: form.email,
      password: form.password,
      age: form.age ? Number(form.age) : undefined,
      height: form.height ? Number(form.height) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
    };

    setIsLoading(true);
    try {
      const data = await api.signup(payload);
      localStorage.setItem("pc_demo_email", form.email);
      localStorage.setItem("pc_demo_user_id", String(data.user_id));
      localStorage.setItem("pc_demo_username", data.name || form.email);
      setForm({ fullname: "", age: "", email: "", height: "", weight: "", password: "" });
      onNavigate("signin");
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.12), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.08), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#e6f7f9",
      padding: "40px 20px", boxSizing: "border-box",
    }}>

      <div style={{
        width: "100%", maxWidth: "580px",
        background: "rgba(11,18,33,0.95)",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        padding: "48px",
        boxSizing: "border-box",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "12px",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "800", fontSize: "17px", color: "white", flexShrink: 0,
            boxShadow: "0 6px 20px rgba(124,58,237,0.4)",
          }}>PC</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "white" }}>Create Account 🚀</h2>
            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
              Fill in your details to get started — it's free!
            </p>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Full Name */}
            <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Full Name
              <input type="text" value={form.fullname} onChange={e => update("fullname", e.target.value)}
                placeholder="Jane Doe" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Email */}
            <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Email Address
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Age */}
            <div style={labelStyle}>
              Age
              <input type="number" value={form.age} onChange={e => update("age", e.target.value)}
                placeholder="25" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Height */}
            <div style={labelStyle}>
              Height (cm)
              <input type="number" value={form.height} onChange={e => update("height", e.target.value)}
                placeholder="170" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Weight */}
            <div style={labelStyle}>
              Weight (kg)
              <input type="number" value={form.weight} onChange={e => update("weight", e.target.value)}
                placeholder="65" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            {/* Password */}
            <div style={labelStyle}>
              Password
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={e => update("password", e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ ...inputStyle, paddingRight: "44px" }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: "15px",
                }}>{showPassword ? "🙈" : "👁️"}</button>
              </div>
            </div>

          </div>

          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
            🔒 Password must be at least 6 characters
          </p>

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px",
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px", color: "#fca5a5", fontSize: "13px",
            }}>⚠️ {error}</div>
          )}

          <button type="submit" disabled={isLoading} style={{
            width: "100%", padding: "15px",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            border: "none", borderRadius: "12px", color: "white",
            fontSize: "15px", fontWeight: "700", cursor: "pointer",
            opacity: isLoading ? 0.7 : 1, marginTop: "4px",
          }}>{isLoading ? "Creating account..." : "Create Account 🚀"}</button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>Already have an account?</span>
            <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
          </div>

          <button type="button" onClick={() => onNavigate("signin")} style={{
            width: "100%", padding: "13px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", color: "rgba(255,255,255,0.75)",
            fontSize: "14px", fontWeight: "600", cursor: "pointer",
          }}>Sign In Instead</button>

          <button type="button" onClick={() => onNavigate("index")} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.25)",
            fontSize: "13px", cursor: "pointer", textAlign: "center", padding: "4px 0",
          }}>← Back to home</button>

        </form>
      </div>
    </div>
  );
}
