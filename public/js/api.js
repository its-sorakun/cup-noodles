  // API Client
  // -----------------------------------------------------------------------
  const api = {
    async getLibraries() {
      const res = await fetch("/api/libraries");
      if (!res.ok) throw new Error("Failed to fetch libraries");
      return res.json();
    },
    async getLibrary(name) {
      const res = await fetch(`/api/libraries/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Failed to fetch library: ${name}`);
      return res.json();
    },
    async getConfig() {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    async updateLibrary(data) {
      const res = await fetch("/api/config/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update library");
      return res.json();
    },
    streamUrl(libraryName, relativePath) {
      return `/api/stream/${encodeURIComponent(libraryName)}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
    },
    thumbnailUrl(libraryName, relativePath, width = 400) {
      return `/api/thumbnail/${encodeURIComponent(libraryName)}/${relativePath.split("/").map(encodeURIComponent).join("/")}?w=${width}`;
    },
  };

  // -----------------------------------------------------------------------