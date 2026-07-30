  // API Client
  // -----------------------------------------------------------------------
  const isWebProxy = window.location.port === '1337' || (!window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('127.'));
  const API_BASE = isWebProxy ? "" : "http://localhost:1337";

  async function authFetch(url, options = {}) {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
      };
    }
    const res = await fetch(API_BASE + url, options);
    if (res.status === 401) {
      localStorage.removeItem("jwt_token");
      window.location.hash = "/login";
      throw new Error("Unauthorized");
    }
    return res;
  }

  function appendToken(url) {
    const fullUrl = API_BASE + url;
    const token = localStorage.getItem("jwt_token");
    if (!token) return fullUrl;
    return fullUrl.includes("?") ? `${fullUrl}&token=${token}` : `${fullUrl}?token=${token}`;
  }

  const api = {
    API_BASE,
    authFetch,
    async needsSetup() {
      // Retry logic for sidecar boot race condition
      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch(API_BASE + "/api/needs-setup");
          if (res.ok) {
            const data = await res.json();
            return data.needsSetup;
          }
        } catch (e) {
          // If connection refused, wait and retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      return false;
    },
    async setup(username, password) {
      const res = await fetch(API_BASE + "/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error("Setup failed");
      const data = await res.json();
      localStorage.setItem("jwt_token", data.token);
      document.cookie = `jwt_token=${data.token}; path=/; max-age=2592000`; // 30 days
      return data;
    },
    async login(username, password) {
      const res = await fetch(API_BASE + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      localStorage.setItem("jwt_token", data.token);
      document.cookie = `jwt_token=${data.token}; path=/; max-age=2592000`; // 30 days
      return data;
    },
    logout() {
      localStorage.removeItem("jwt_token");
      document.cookie = "jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.hash = "/login";
    },
    async getLibraries() {
      const res = await authFetch("/api/libraries");
      if (!res.ok) throw new Error("Failed to fetch libraries");
      return res.json();
    },
    async getLibrary(name) {
      const res = await authFetch(`/api/libraries/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Failed to fetch library: ${name}`);
      return res.json();
    },
    async getConfig() {
      const res = await authFetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    async updateLibrary(data) {
      const res = await authFetch("/api/config/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update library");
      return res.json();
    },
    streamUrl(libraryName, relativePath) {
      const url = `/api/stream/${encodeURIComponent(libraryName)}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
      return appendToken(url);
    },
    thumbnailUrl(libraryName, relativePath, width = 400) {
      const url = `/api/thumbnail/${encodeURIComponent(libraryName)}/${relativePath.split("/").map(encodeURIComponent).join("/")}?w=${width}`;
      return appendToken(url);
    },
  };

  // -----------------------------------------------------------------------