// ==========================================================================
// Cup Noodles — SPA Controller
// ==========================================================================

(() => {
  "use strict";

  // -----------------------------------------------------------------------
  // SVG Icon Library (inline, no external deps)
  // -----------------------------------------------------------------------
  const ICONS = {
    image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    film: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,
    tv: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
    monitor: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    music: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    camera: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    folder: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    arrowLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    chevronLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevronRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    x: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    save: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    headphones: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    pause: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    playSmall: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  };

  const GLOW_COLORS = ["purple", "blue", "pink", "green", "purple", "blue"];

  // -----------------------------------------------------------------------
  // Utility helpers
  // -----------------------------------------------------------------------
  function formatSize(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getFileExtension(name) {
    return name.split(".").pop().toUpperCase();
  }

  // -----------------------------------------------------------------------
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
  // State
  // -----------------------------------------------------------------------
  let state = {
    libraries: [],
    currentLibrary: null,
    loading: false,
    searchQuery: "",
  };

  // -----------------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------------
  const $content = document.getElementById("app-content");
  const $nav = document.getElementById("main-nav");

  // -----------------------------------------------------------------------
  // Router (hash-based)
  // -----------------------------------------------------------------------
  function getRoute() {
    const hash = window.location.hash.slice(1) || "/";
    return hash;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  async function handleRoute() {
    const route = getRoute();
    updateNavActiveState(route);

    if (route === "/" || route === "") {
      await renderHome();
    } else if (route === "/settings") {
      await renderSettings();
    } else if (route.startsWith("/library/")) {
      const raw = route.replace("/library/", "");
      const segments = raw.split("/").map(decodeURIComponent);
      const name = segments[0];
      const subpath = segments.slice(1).filter(Boolean).join("/");
      await renderLibrary(name, subpath);
    } else {
      renderNotFound();
    }
  }

  function updateNavActiveState(route) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    if (route === "/" || route === "") {
      document.querySelector('[data-route="home"]')?.classList.add("active");
    } else if (route === "/settings") {
      document.querySelector('[data-route="settings"]')?.classList.add("active");
    }
  }

  // -----------------------------------------------------------------------
  // Scroll-aware nav
  // -----------------------------------------------------------------------
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      $nav.classList.add("scrolled");
    } else {
      $nav.classList.remove("scrolled");
    }
  });

  // -----------------------------------------------------------------------
  // Page: Home — Dashboard
  // -----------------------------------------------------------------------
  async function renderHome() {
    $content.innerHTML = renderLoadingGrid(6);
    state.loading = true;

    try {
      state.libraries = await api.getLibraries();
    } catch (err) {
      $content.innerHTML = renderError("Failed to load libraries", err.message);
      return;
    }

    state.loading = false;

    const libs = state.libraries;

    $content.innerHTML = `
      <div class="fade-in max-w-6xl mx-auto py-4">
        <div class="mb-12 text-center">
          <h1 class="text-3xl sm:text-5xl font-extrabold mb-3 tracking-tight">Your Library</h1>
          <p class="text-sm sm:text-base font-medium" style="color: var(--text-secondary);">
            ${libs.length} collections &nbsp;·&nbsp; ${libs.reduce((a, l) => a + (l.fileCount || 0), 0)} total files
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children justify-center mx-auto">
          ${libs.map((lib, i) => renderLibraryCard(lib, i)).join("")}
        </div>
      </div>
    `;

    // Attach click handlers
    document.querySelectorAll("[data-library]").forEach((card) => {
      card.addEventListener("click", () => {
        navigate(`/library/${encodeURIComponent(card.dataset.library)}`);
      });
    });
  }

  function renderLibraryCard(lib, index) {
    const icon = ICONS[lib.icon] || ICONS.folder;
    const glow = GLOW_COLORS[index % GLOW_COLORS.length];
    const configured = lib.configured && lib.exists !== false;
    const count = lib.fileCount || 0;

    let statusPill = "";
    if (!lib.configured) {
      statusPill = `<span class="pill pill--pink">Not configured</span>`;
    } else if (lib.exists === false) {
      statusPill = `<span class="pill pill--pink">Path not found</span>`;
    } else if (count === 0) {
      statusPill = `<span class="pill">Empty</span>`;
    } else {
      statusPill = `<span class="pill pill--green">${count} file${count !== 1 ? "s" : ""}</span>`;
    }

    const typeLabel = lib.type === "video" ? "Video" : lib.type === "image" ? "Images" : lib.type === "audio" ? "Audio" : "Mixed";

    return `
      <div class="glass-card p-6 ${configured ? "" : "opacity-50"}" data-glow="${glow}" data-library="${escapeHtml(lib.name)}" id="library-card-${index}">
        <div class="flex items-start justify-between mb-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center icon-box">
            ${icon}
          </div>
          ${statusPill}
        </div>
        <h3 class="text-lg font-semibold mb-1">${escapeHtml(lib.name)}</h3>
        <p class="text-xs mb-3" style="color: var(--text-tertiary);">
          ${escapeHtml(lib.description || typeLabel)}
        </p>
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium" style="color: var(--text-tertiary);">${typeLabel}</span>
          ${configured && count > 0 ? `<span class="text-xs" style="color: var(--text-secondary);">Browse →</span>` : ""}
        </div>
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // Page: Library — Media Grid
  // -----------------------------------------------------------------------
  function getFolderContents(files, subpath = "") {
    const foldersMap = new Map();
    const directFiles = [];
    const prefix = subpath ? (subpath.endsWith("/") ? subpath : subpath + "/") : "";

    for (const f of files) {
      if (prefix && !f.relativePath.startsWith(prefix)) continue;

      const remainder = prefix ? f.relativePath.slice(prefix.length) : f.relativePath;
      const slashIndex = remainder.indexOf("/");

      if (slashIndex !== -1) {
        const folderName = remainder.substring(0, slashIndex);
        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, 0);
        }
        foldersMap.set(folderName, foldersMap.get(folderName) + 1);
      } else {
        directFiles.push(f);
      }
    }

    const folders = Array.from(foldersMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        path: subpath ? `${subpath}/${name}` : name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { folders, files: directFiles };
  }

  async function renderLibrary(name, subpath = "") {
    $content.innerHTML = renderLoadingGrid(12);

    let library;
    try {
      library = await api.getLibrary(name);
    } catch (err) {
      $content.innerHTML = renderError(`Library "${name}" not found`, err.message);
      return;
    }

    state.currentLibrary = library;
    state.searchQuery = "";

    if (!library.configured) {
      $content.innerHTML = renderEmptyLibrary(library, "not-configured");
      return;
    }

    if (library.exists === false) {
      $content.innerHTML = renderEmptyLibrary(library, "not-found");
      return;
    }

    if (library.files.length === 0) {
      $content.innerHTML = renderEmptyLibrary(library, "empty");
      return;
    }

    renderLibraryContent(library, subpath);
  }

  function renderLibraryContent(library, subpath = "") {
    const { folders, files: directFiles } = getFolderContents(library.files, subpath);
    const viewLibrary = { ...library, files: directFiles };
    const isImage = library.type === "image";
    const isAudio = library.type === "audio";
    const gridClass = isImage ? "media-grid media-grid--wallpaper" : isAudio ? "" : "media-grid";
    const isEmpty = folders.length === 0 && directFiles.length === 0;

    const breadcrumbsHtml = subpath ? `
      <div class="text-xs mb-1 font-medium flex items-center gap-1.5 flex-wrap" style="color: var(--text-tertiary);">
        <a href="#/library/${encodeURIComponent(library.name)}" class="hover:underline transition-colors">${escapeHtml(library.name)}</a>
        ${subpath.split("/").map((seg, idx, arr) => {
          const pathSoFar = arr.slice(0, idx + 1).join("/");
          return `<span>/</span> ${idx === arr.length - 1 ? `<span style="color: var(--text-secondary); font-weight: 600;">${escapeHtml(seg)}</span>` : `<a href="#/library/${encodeURIComponent(library.name)}/${pathSoFar.split("/").map(encodeURIComponent).join("/")}" class="hover:underline transition-colors">${escapeHtml(seg)}</a>`}`;
        }).join("")}
      </div>
    ` : "";

    $content.innerHTML = `
      <div class="fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div class="flex items-center gap-4">
            <button class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 icon-box" id="back-btn">
              ${ICONS.arrowLeft}
            </button>
            <div>
              ${breadcrumbsHtml}
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">${escapeHtml(subpath ? subpath.split("/").pop() : library.name)}</h1>
              <p class="text-xs mt-1" style="color: var(--text-secondary);">
                ${folders.length > 0 ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}${directFiles.length > 0 ? ', ' : ''}` : ''}${directFiles.length > 0 ? `${directFiles.length} file${directFiles.length !== 1 ? 's' : ''}` : ''}
                ${isEmpty ? '0 items' : ''}
              </p>
            </div>
          </div>

          ${!isEmpty ? `
            <div class="search-bar w-full sm:w-72">
              ${ICONS.search}
              <input type="text" placeholder="Search in ${escapeHtml(subpath ? subpath.split("/").pop() : library.name)}..." id="search-input">
            </div>
          ` : ""}
        </div>

        ${isEmpty ? `
          <div class="empty-state py-16 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 icon-box">
              ${ICONS.folder}
            </div>
            <div class="empty-state__title text-lg font-semibold">Empty Folder</div>
            <div class="empty-state__desc text-sm" style="color: var(--text-tertiary);">No media files found directly in this directory or its subfolders.</div>
          </div>
        ` : `
          <!-- Folders Grid -->
          ${folders.length > 0 ? `
            ${directFiles.length > 0 ? `<h2 class="text-xs font-bold uppercase tracking-wider mb-3 ml-1" style="color: var(--text-tertiary);">Folders</h2>` : ""}
            <div class="media-grid gap-5 stagger-children mb-10" id="folders-grid">
              ${folders.map((folder, i) => renderFolderCard(library, folder, i)).join("")}
            </div>
          ` : ""}

          <!-- Files Grid / List -->
          ${directFiles.length > 0 ? `
            ${folders.length > 0 ? `<h2 class="text-xs font-bold uppercase tracking-wider mb-3 ml-1" style="color: var(--text-tertiary);">Files</h2>` : ""}
            <div class="${gridClass} stagger-children" id="media-grid">
              ${isAudio ? renderAudioList(viewLibrary) : directFiles.map((f, i) => renderMediaItem(viewLibrary, f, i)).join("")}
            </div>
          ` : ""}
        `}
      </div>
    `;

    // Back button
    document.getElementById("back-btn").addEventListener("click", () => {
      if (!subpath) {
        navigate("/");
      } else {
        const parentPath = subpath.includes("/") ? subpath.substring(0, subpath.lastIndexOf("/")) : "";
        if (parentPath) {
          navigate(`/library/${encodeURIComponent(library.name)}/${parentPath.split("/").map(encodeURIComponent).join("/")}`);
        } else {
          navigate(`/library/${encodeURIComponent(library.name)}`);
        }
      }
    });

    // Search
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        filterMediaGrid(library);
      });
    }

    // Click handlers for folders
    document.querySelectorAll("[data-folder]").forEach((item) => {
      item.addEventListener("click", () => {
        const folderPath = item.dataset.folder;
        navigate(`/library/${encodeURIComponent(library.name)}/${folderPath.split("/").map(encodeURIComponent).join("/")}`);
      });
    });

    // Click handlers for media items
    if (!isAudio) {
      attachMediaClickHandlers(viewLibrary);
    } else {
      attachAudioClickHandlers(viewLibrary);
    }
  }

  function renderFolderCard(library, folder, index) {
    return `
      <div class="media-item cursor-pointer transition-all duration-300 hover:-translate-y-1" data-folder="${escapeHtml(folder.path)}" data-name="${escapeHtml(folder.name.toLowerCase())}" id="folder-card-${index}">
        <div class="media-item__thumb flex flex-col items-center justify-center p-4 relative" style="background: rgba(139, 92, 246, 0.05); border-bottom: 1px solid var(--glass-border);">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 icon-box transition-transform duration-300 transform hover:scale-110" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6;">
            ${ICONS.folder || '📁'}
          </div>
          <span class="pill pill--purple text-xs font-semibold mt-1">${folder.count} file${folder.count !== 1 ? "s" : ""}</span>
        </div>
        <div class="media-item__info">
          <div class="media-item__name font-semibold text-sm truncate flex items-center gap-2" title="${escapeHtml(folder.name)}">
            <span>${escapeHtml(folder.name)}</span>
          </div>
          <div class="media-item__meta" style="color: var(--text-tertiary);">Folder &nbsp;·&nbsp; Click to explore</div>
        </div>
      </div>
    `;
  }

  function renderMediaItem(library, file, index) {
    const isImage = file.type === "image";
    const isVideo = file.type === "video";
    const thumbUrl = isImage ? api.thumbnailUrl(library.name, file.relativePath, 500) : "";

    const nameNoExt = file.name.replace(/\.[^.]+$/, "");
    const ext = getFileExtension(file.name);

    return `
      <div class="media-item" data-index="${index}" data-name="${escapeHtml(file.name.toLowerCase())}" id="media-item-${index}">
        ${isImage ? `
          <img 
            class="media-item__thumb" 
            src="${thumbUrl}" 
            alt="${escapeHtml(file.name)}"
            loading="lazy"
            onerror="this.style.display='none'"
          >
        ` : `
          <div class="media-item__thumb flex items-center justify-center" style="background: var(--surface-2);">
            <div class="text-center">
              <div class="mb-2 opacity-40">${isVideo ? ICONS.film : ICONS.folder}</div>
              <span class="pill pill--blue text-xs">${ext}</span>
            </div>
          </div>
        `}
        ${isVideo ? `
          <div class="media-item__overlay">
            <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(139, 92, 246, 0.7); backdrop-filter: blur(6px);">
              ${ICONS.play}
            </div>
          </div>
        ` : ""}
        <div class="media-item__info">
          <div class="media-item__name" title="${escapeHtml(file.name)}">${escapeHtml(nameNoExt)}</div>
          <div class="media-item__meta">${formatSize(file.size)} · ${ext}</div>
        </div>
      </div>
    `;
  }

  function renderAudioList(library) {
    return `
      <div class="flex flex-col gap-3 max-w-2xl mx-auto">
        ${library.files.map((f, i) => {
          const nameNoExt = f.name.replace(/\.[^.]+$/, "");
          return `
            <div class="audio-item" data-index="${i}" data-name="${escapeHtml(f.name.toLowerCase())}" id="audio-item-${i}">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(139, 92, 246, 0.1); color: rgba(139, 92, 246, 0.8);">
                ${ICONS.music}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${escapeHtml(nameNoExt)}</div>
                <div class="text-xs" style="color: var(--text-tertiary);">${formatSize(f.size)} · ${getFileExtension(f.name)}</div>
              </div>
              <div class="w-8 h-8 rounded-full flex items-center justify-center play-btn icon-box">
                ${ICONS.playSmall}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Audio Player Bar -->
      <div class="glass mt-8 p-4 max-w-2xl" id="audio-player-bar" style="display: none;">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(139, 92, 246, 0.15); color: rgba(139, 92, 246, 0.8);">
            ${ICONS.headphones}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate" id="audio-now-playing"></div>
            <audio controls class="w-full mt-2" id="audio-element" style="height: 32px; filter: hue-rotate(250deg) brightness(0.8);"></audio>
          </div>
        </div>
      </div>
    `;
  }

  function filterMediaGrid(library) {
    const q = state.searchQuery;
    const items = document.querySelectorAll("[data-name]");
    items.forEach((item) => {
      const name = item.dataset.name;
      item.style.display = !q || name.includes(q) ? "" : "none";
    });
  }

  // -----------------------------------------------------------------------
  // Click handlers — open media viewer
  // -----------------------------------------------------------------------
  function attachMediaClickHandlers(library) {
    document.querySelectorAll(".media-item").forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index, 10);
        openMediaViewer(library, index);
      });
    });
  }

  function attachAudioClickHandlers(library) {
    document.querySelectorAll(".audio-item").forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index, 10);
        playAudio(library, index);
      });
    });
  }

  // -----------------------------------------------------------------------
  // Media Viewer (Lightbox / Video Player)
  // -----------------------------------------------------------------------
  let currentViewerIndex = 0;
  let currentViewerLibrary = null;

  function openMediaViewer(library, index) {
    currentViewerLibrary = library;
    currentViewerIndex = index;
    renderViewer();
  }

  function renderViewer() {
    const library = currentViewerLibrary;
    const file = library.files[currentViewerIndex];
    const url = api.streamUrl(library.name, file.relativePath);
    const isImage = file.type === "image";
    const isVideo = file.type === "video";

    // Remove existing overlay if any
    closeViewer();

    const overlay = document.createElement("div");
    overlay.className = "player-overlay";
    overlay.id = "media-viewer-overlay";

    const hasMultiple = library.files.filter(f => f.type === file.type).length > 1;
    const nameNoExt = file.name.replace(/\.[^.]+$/, "");

    overlay.innerHTML = `
      <button class="player-close" id="viewer-close">${ICONS.x}</button>

      ${hasMultiple ? `
        <button class="lightbox-nav lightbox-nav--prev" id="viewer-prev">${ICONS.chevronLeft}</button>
        <button class="lightbox-nav lightbox-nav--next" id="viewer-next">${ICONS.chevronRight}</button>
      ` : ""}

      <div class="flex flex-col items-center gap-4 max-w-full">
        ${isImage ? `
          <img src="${url}" alt="${escapeHtml(file.name)}" style="max-width: 92vw; max-height: 82vh; border-radius: var(--radius-md); box-shadow: 0 25px 100px -20px rgba(0,0,0,0.8);">
        ` : isVideo ? `
          <video controls autoplay style="max-width: 92vw; max-height: 82vh; border-radius: var(--radius-md); box-shadow: 0 25px 100px -20px rgba(0,0,0,0.8);">
            <source src="${url}" type="${getMimeFromExt(file.name)}">
            Your browser does not support the video tag.
          </video>
        ` : ""}
        <div class="text-center">
          <p class="text-sm font-medium">${escapeHtml(nameNoExt)}</p>
          <p class="text-xs mt-1" style="color: var(--text-tertiary);">${formatSize(file.size)} · ${getFileExtension(file.name)}</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close button
    document.getElementById("viewer-close").addEventListener("click", closeViewer);

    // Click outside to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeViewer();
    });

    // Navigation
    if (hasMultiple) {
      document.getElementById("viewer-prev")?.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateViewer(-1);
      });
      document.getElementById("viewer-next")?.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateViewer(1);
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", viewerKeyHandler);
  }

  function navigateViewer(direction) {
    const lib = currentViewerLibrary;
    if (!lib) return;
    const total = lib.files.length;
    currentViewerIndex = (currentViewerIndex + direction + total) % total;
    renderViewer();
  }

  function viewerKeyHandler(e) {
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") navigateViewer(-1);
    if (e.key === "ArrowRight") navigateViewer(1);
  }

  function closeViewer() {
    const overlay = document.getElementById("media-viewer-overlay");
    if (overlay) {
      overlay.remove();
    }
    document.removeEventListener("keydown", viewerKeyHandler);
  }

  function getMimeFromExt(name) {
    const ext = name.split(".").pop().toLowerCase();
    const map = {
      mp4: "video/mp4", mkv: "video/x-matroska", avi: "video/x-msvideo",
      mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v",
      flv: "video/x-flv", wmv: "video/x-ms-wmv",
    };
    return map[ext] || "video/mp4";
  }

  // -----------------------------------------------------------------------
  // Audio Player
  // -----------------------------------------------------------------------
  function playAudio(library, index) {
    const file = library.files[index];
    const url = api.streamUrl(library.name, file.relativePath);
    const nameNoExt = file.name.replace(/\.[^.]+$/, "");

    const bar = document.getElementById("audio-player-bar");
    const audio = document.getElementById("audio-element");
    const nowPlaying = document.getElementById("audio-now-playing");

    if (bar && audio && nowPlaying) {
      bar.style.display = "block";
      nowPlaying.textContent = nameNoExt;
      audio.src = url;
      audio.play().catch(() => {}); // Autoplay may be blocked

      // Highlight active item
      document.querySelectorAll(".audio-item").forEach((el) => el.classList.remove("playing"));
      const activeItem = document.querySelector(`.audio-item[data-index="${index}"]`);
      if (activeItem) activeItem.classList.add("playing");
    }
  }

  // -----------------------------------------------------------------------
  // Page: Settings
  // -----------------------------------------------------------------------
  async function renderSettings() {
    $content.innerHTML = renderLoadingGrid(3);

    let config;
    try {
      config = await api.getConfig();
    } catch (err) {
      $content.innerHTML = renderError("Failed to load settings", err.message);
      return;
    }

    $content.innerHTML = `
      <div class="fade-in max-w-3xl mx-auto py-4">
        <div class="mb-10 text-center sm:text-left">
          <h1 class="text-3xl font-bold tracking-tight mb-2">Settings</h1>
          <p class="text-sm" style="color: var(--text-secondary);">Configure your media library directories.</p>
        </div>

        <div class="flex flex-col gap-4" id="settings-list">
          ${config.libraries.map((lib, i) => renderSettingsRow(lib, i)).join("")}
        </div>

        <div class="glass p-5 mt-8">
          <h3 class="text-sm font-semibold mb-3">Server Info</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span style="color: var(--text-tertiary);">Port</span>
              <p class="font-mono">${config.server?.port || 1337}</p>
            </div>
            <div>
              <span style="color: var(--text-tertiary);">Host</span>
              <p class="font-mono">${config.server?.host || "0.0.0.0"}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach save handlers
    document.querySelectorAll(".settings-save-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.name;
        const input = document.querySelector(`.settings-path-input[data-name="${name}"]`);
        if (!input) return;

        btn.disabled = true;
        btn.textContent = "Saving...";

        try {
          await api.updateLibrary({ name, path: input.value });
          showToast(`Updated "${name}" path`);
          btn.innerHTML = `${ICONS.save} Saved!`;
          setTimeout(() => {
            btn.innerHTML = `${ICONS.save} Save`;
            btn.disabled = false;
          }, 1500);
        } catch (err) {
          btn.textContent = "Error";
          btn.disabled = false;
        }
      });
    });
  }

  function renderSettingsRow(lib, index) {
    const icon = ICONS[lib.icon] || ICONS.folder;
    return `
      <div class="glass p-5" id="settings-row-${index}">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center icon-box">
            ${icon}
          </div>
          <div>
            <h3 class="text-sm font-semibold">${escapeHtml(lib.name)}</h3>
            <span class="text-xs" style="color: var(--text-tertiary);">${lib.type} library</span>
          </div>
        </div>
        <div class="flex gap-3">
          <input 
            type="text" 
            class="settings-input settings-path-input flex-1" 
            data-name="${escapeHtml(lib.name)}"
            placeholder="e.g., D:\\Media\\${lib.name}"
            value="${escapeHtml(lib.path || "")}"
          >
          <button class="btn-glass settings-save-btn" data-name="${escapeHtml(lib.name)}">
            ${ICONS.save} Save
          </button>
        </div>
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // Loading / Error / Empty states
  // -----------------------------------------------------------------------
  function renderLoadingGrid(count) {
    return `
      <div class="mt-8 max-w-6xl mx-auto">
        <div class="skeleton w-56 h-9 mx-auto mb-3"></div>
        <div class="skeleton w-64 h-5 mx-auto mb-12"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center mx-auto">
          ${Array(count).fill("").map(() => `
            <div class="skeleton" style="height: 200px;"></div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderError(title, detail) {
    return `
      <div class="empty-state">
        <div class="text-5xl mb-6">⚠️</div>
        <div class="empty-state__title">${escapeHtml(title)}</div>
        <div class="empty-state__desc">${escapeHtml(detail || "")}</div>
        <button class="btn-glass mt-6" onclick="location.hash='/'">Go Home</button>
      </div>
    `;
  }

  function renderEmptyLibrary(library, reason) {
    const icon = ICONS[library.icon] || ICONS.folder;
    let title = "";
    let desc = "";

    if (reason === "not-configured") {
      title = "Library not configured";
      desc = `No directory path has been set for "${library.name}". Go to Settings to configure it.`;
    } else if (reason === "not-found") {
      title = "Directory not found";
      desc = `The path "${library.path}" doesn't exist. Check your settings.`;
    } else {
      title = "No files found";
      desc = `The "${library.name}" directory is empty. Add some ${library.type} files to get started.`;
    }

    return `
      <div class="fade-in">
        <div class="flex items-center gap-4 mb-10">
          <button class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 icon-box" onclick="location.hash='/'">
            ${ICONS.arrowLeft}
          </button>
          <h1 class="text-2xl font-bold tracking-tight">${escapeHtml(library.name)}</h1>
        </div>

        <div class="empty-state">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 icon-box">
            ${icon}
          </div>
          <div class="empty-state__title">${escapeHtml(title)}</div>
          <div class="empty-state__desc">${escapeHtml(desc)}</div>
          ${reason === "not-configured" ? `
            <button class="btn-glass mt-6" onclick="location.hash='/settings'">Open Settings</button>
          ` : `
            <button class="btn-glass mt-6" onclick="location.hash='/'">Go Home</button>
          `}
        </div>
      </div>
    `;
  }

  function renderNotFound() {
    $content.innerHTML = `
      <div class="empty-state">
        <div class="text-6xl mb-6">🍜</div>
        <div class="empty-state__title">Page not found</div>
        <div class="empty-state__desc">This page doesn't exist. Let's get you back home.</div>
        <button class="btn-glass mt-6" onclick="location.hash='/'">Go Home</button>
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // Toast notifications
  // -----------------------------------------------------------------------
  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // -----------------------------------------------------------------------
  // Theme Manager & Initialize
  // -----------------------------------------------------------------------
  const ThemeManager = {
    init() {
      const savedTheme = localStorage.getItem("cup-noodles-theme") || 
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      this.setTheme(savedTheme);

      const toggleBtn = document.getElementById("theme-toggle-btn");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          const current = document.documentElement.getAttribute("data-theme") || "dark";
          const next = current === "dark" ? "light" : "dark";
          this.setTheme(next);
        });
      }
    },
    setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("cup-noodles-theme", theme);
      
      const toggleBtn = document.getElementById("theme-toggle-btn");
      if (toggleBtn) {
        toggleBtn.innerHTML = theme === "dark" ? `
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <span class="hidden sm:inline font-medium">Light</span>
        ` : `
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span class="hidden sm:inline font-medium">Dark</span>
        `;
      }
    }
  };

  window.addEventListener("hashchange", handleRoute);
  ThemeManager.init();
  handleRoute();

})();