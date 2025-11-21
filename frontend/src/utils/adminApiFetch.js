export function adminApiFetch(url, options = {}, csrfToken) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const method = (options.method || "GET").toUpperCase();
  if (
    csrfToken &&
    (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")
  ) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}
