export function adminApiFetch(url, options = {}, csrfToken) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const method = (options.method || "GET").toUpperCase();
  let token = csrfToken;
  if (!token && typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )look_admin_csrf=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : null;
  }
  if (
    token &&
    (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")
  ) {
    headers["X-CSRF-Token"] = token;
  }

  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}
