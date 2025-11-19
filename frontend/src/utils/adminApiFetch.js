export function adminApiFetch(url, options = {}, admin) {
  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };

  // Phase 1: send admin email in header
  if (admin?.email) {
    headers["X-Admin-Email"] = admin.email;
  }

  return fetch(url, { ...options, headers });
}
