function getApiBase() {
  let url = process.env.NEXT_PUBLIC_API_URL;
  if (url && !url.includes("onrender.com")) {
    return url;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000/api/v1`;
  }
  return "http://localhost:5000/api/v1";
}

async function request(path, options = {}) {
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/v1/")) {
    cleanPath = cleanPath.replace(/^\/api\/v1/, "");
  }
  const baseUrl = getApiBase();
  const url = `${baseUrl}${cleanPath}`;

  console.log(`[API Request] ${options.method || "GET"} -> ${url}`);

  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("erp_access_token");
  }

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  };

  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  if (config.body instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  let res;
  try {
    res = await fetch(url, config);
  } catch (netErr) {
    console.error("[API Network Error]", url, netErr);
    const err = new Error("Unable to connect to server. Please check if the backend is running.");
    err.status = 503;
    throw err;
  }

  let json = {};
  try {
    json = await res.json();
  } catch (parseErr) {
    console.error("[API JSON Parse Error]", url, parseErr);
  }

  if (!res.ok) {
    if (res.status >= 500) {
      console.error("[API Server Error]", url, res.status, json);
    }
    if (res.status === 401 && !cleanPath.includes("/auth/")) {
      localStorage.removeItem("erp_access_token");
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    }
    let message = json.error?.message || json.message;
    if (res.status === 404 || message === "Route not found" || message === "API route not found") {
      message = "Service endpoint not found or backend server is unreachable. Please check backend status.";
    }
    if (!message) {
      message = `Request failed (${res.status})`;
    }
    const err = new Error(message);
    err.status = res.status;
    err.code = json.error?.code;
    err.details = json.error?.details;
    throw err;
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  return request(path, { method: "POST", body: formData });
}
