import React, { useState, useEffect } from "react";
import LogoHeader from "./LogoHeader";
import * as api from "../api";

function getParamsFromHash() {
  const hash = window.location.hash || "";
  const query = hash.split("?")[1] || "";
  const params = new URLSearchParams(query);
  return {
    uid: params.get("uid") || "",
    token: params.get("token") || "",
  };
}

export default function ResetPassword({ onNavigate }) {
  const [{ uid, token }, setTokens] = useState(() => getParamsFromHash());
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = () => setTokens(getParamsFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!uid || !token) {
      setError("Invalid or missing reset link.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setBusy(true);
      await api.resetPasswordWithToken(uid, token, password);
      setMessage("Password updated. You can now sign in with your new password.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.message || "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-wrap">
      <LogoHeader />
      <div className="card form-card">
        <h2>Reset password</h2>
        <p className="muted small">
          Choose a new password for your Pose Corrector AI account.
        </p>
        <form onSubmit={submit} className="form">
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
            />
          </label>
          {error && <div className="error">{error}</div>}
          {message && <div className="success small">{message}</div>}
          <div className="button-row">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => onNavigate("signin")}
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

