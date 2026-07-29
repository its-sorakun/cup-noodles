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