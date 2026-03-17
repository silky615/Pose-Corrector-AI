/**
 * API client for Exercise-Correction backend (Prakriti).
 * Base URL: REACT_APP_API_URL or same origin if empty.
 */

const getBaseUrl = () => {
  const url = process.env.REACT_APP_API_URL || "";
  return url.replace(/\/$/, "");
};

function getApiUrl(path) {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/**
 * Map frontend exercise ids (Silky) to backend exercise_type (Prakriti).
 */
export function toBackendExerciseType(frontendId) {
  const map = {
    "tree-pose": "tree_pose",
    plank: "plank",
    "bicep-curl": "bicep_curl",
    squat: "squat",
    pushup: "push_up",
    lunges: "lunge",
  };
  return map[frontendId] || frontendId.replace(/-/g, "_");
}

/**
 * POST /api/auth/signin
 * Body: { email, password }
 * Returns: { success, user_id, name, email } or { error }
 */
export async function signin(email, password) {
  const res = await fetch(getApiUrl("/api/auth/signin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Sign in failed (${res.status})`);
  return data;
}

/**
 * POST /api/auth/forgot
 * Body: { email }
 * Sends a password reset link to the user's email (dev: link also printed in backend console).
 */
export async function requestPasswordReset(email) {
  const res = await fetch(getApiUrl("/api/auth/forgot"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Reset failed (${res.status})`);
  return data;
}

/**
 * POST /api/auth/reset-confirm
 * Body: { uid, token, new_password }
 */
export async function resetPasswordByEmail(email, newPassword) {
  const res = await fetch(getApiUrl("/api/auth/reset-by-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reset failed");
  return data;
}

export async function resetPasswordWithToken(uid, token, newPassword) {
  const res = await fetch(getApiUrl("/api/auth/reset-confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Reset failed (${res.status})`);
  return data;
}

/**
 * POST /api/auth/signup
 * Body: { firstName, lastName, email, password, age?, height?, weight? }
 */
export async function signup(payload) {
  const res = await fetch(getApiUrl("/api/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Sign up failed (${res.status})`);
  return data;
}

/**
 * POST /api/session/start
 * Body: { user_id, exercise_type, mode? }
 */
export async function startSession(userId, exerciseType, mode = "live") {
  const res = await fetch(getApiUrl("/api/session/start"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      exercise_type: exerciseType,
      mode,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to start session");
  return data;
}

/**
 * POST /api/session/end
 * Body: { session_id, total_reps?, avg_accuracy? }
 */
export async function endSession(sessionId, totalReps = 0, avgAccuracy = 0) {
  const res = await fetch(getApiUrl("/api/session/end"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      total_reps: totalReps,
      avg_accuracy: avgAccuracy,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to end session");
  return data;
}

/**
 * POST /api/video/stream?type=<exercise_type>
 * Body: { landmarks: [{x,y,z,visibility}, ...], reset_counter?: boolean }
 * Returns: { message, accuracy, posture_ok, counter?, stage?, ... }
 */
export async function streamAnalysis(exerciseType, landmarks, resetCounter = false) {
  const typeParam = toBackendExerciseType(exerciseType);
  const url = `${getApiUrl("/api/video/stream")}?type=${encodeURIComponent(typeParam)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ landmarks, reset_counter: resetCounter }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Stream analysis failed");
  return data;
}

/**
 * POST /api/video/upload?type=<exercise>&user_id=<id>
 * FormData: file = video file
 */
export async function uploadVideo(file, exerciseType, userId = null) {
  const typeParam = toBackendExerciseType(exerciseType);
  let url = `${getApiUrl("/api/video/upload")}?type=${encodeURIComponent(typeParam)}`;
  if (userId != null) url += `&user_id=${encodeURIComponent(userId)}`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Upload failed");
  return data;
}

/**
 * GET /api/profile?user_id=<id>
 * Returns: { name, email, age?, height?, weight?, totalWorkouts, thisWeek, streakDays, avgScore, recentWorkouts[], weeklyActivity[] }
 * Backend can aggregate from User + Session models.
 */
export async function getProfile(userId) {
  const url = `${getApiUrl("/api/profile")}?user_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load profile");
  return data;
}

const api = {
  getApiUrl,
  toBackendExerciseType,
  signin,
  signup,
  requestPasswordReset,
  resetPasswordWithToken,
  resetPasswordByEmail,
  startSession,
  endSession,
  streamAnalysis,
  uploadVideo,
  getProfile,
};

export default api;
