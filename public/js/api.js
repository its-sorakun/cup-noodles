  // API Client
  // -----------------------------------------------------------------------
  async function authFetch(url, options = {}) {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
      };
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem("jwt_token");
      window.location.hash = "/login";
      throw new Error("Unauthorized");
    }
    return res;
  }

  function appendToken(url) {
    const token = localStorage.getItem("jwt_token");
    if (!token) return url;
    return url.includes("?") ? `${url}&token=${token}` : `${url}?token=${token}`;
  }

  const api = {
    authFetch,
    async login(username, password) {
      const res = await fetch("/api/login", {
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