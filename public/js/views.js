// -----------------------------------------------------------------------
// Page: Login
// -----------------------------------------------------------------------
async function renderLogin() {
  $content.innerHTML = `
      <div class="weeb-login-wrapper fade-in flex-col gap-8 sm:gap-12">
        
        <!-- Centered Logo (Flow Layout) -->
        <div class="flex justify-center items-center gap-4 w-full -mt-28 sm:-mt-36 mb-8 sm:mb-12">
          <span class="text-4xl sm:text-5xl" style="font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', 'Android Emoji', 'EmojiSymbols';">🍜</span>
          <span class="text-3xl sm:text-4xl font-extrabold tracking-tight" style="color: var(--text-primary);">
            Cup Noodles
          </span>
        </div>

        <div class="weeb-login-glass group">
          
          <div class="relative z-10 w-full">
            <div class="mb-8">
              <h2 class="weeb-title text-3xl sm:text-4xl flex flex-col gap-2">
                <span>Okaeri, Senpai! ~</span>
                <span class="text-xl sm:text-2xl opacity-40 font-bold">おかえり、先輩！</span>
              </h2>
              <p class="weeb-subtitle">
                Please sign in to your personal vault<br>
                <span class="text-xs opacity-50 mt-1 inline-block">(プライベート保管庫へサインインしてください)</span>
              </p>
            </div>
            
            <form id="login-form" class="space-y-6">
              <div class="weeb-input-group group/input">
                <input type="text" id="username" required class="weeb-input peer" placeholder="Username" />
                <label for="username" class="weeb-label">Username</label>
              </div>
              
              <div class="weeb-input-group group/input">
                <input type="password" id="password" required class="weeb-input peer" placeholder="Password" />
                <label for="password" class="weeb-label">Password</label>
              </div>

              <div id="login-error" class="text-red-400 text-sm text-center hidden font-medium py-2 rounded bg-red-500/10 border border-red-500/20"></div>

              <button type="submit" class="weeb-btn">
                Unlock Vault
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const btn = e.target.querySelector("button");
    const err = document.getElementById("login-error");

    err.classList.add("hidden");
    btn.textContent = "AUTHENTICATING...";
    btn.disabled = true;

    try {
      await api.login(user, pass);
      // On success, redirect to home and refresh nav
      navigate("/");
      window.location.reload();
    } catch (error) {
      err.textContent = "Invalid username or password";
      err.classList.remove("hidden");
      btn.textContent = "UNLOCK VAULT";
      btn.disabled = false;

      // Simple shake emulation
      e.target.style.transform = "translateX(5px)";
      setTimeout(() => e.target.style.transform = "translateX(-5px)", 100);
      setTimeout(() => e.target.style.transform = "translateX(5px)", 200);
      setTimeout(() => e.target.style.transform = "translateX(0)", 300);
    }
  });
}

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

  let sysStatus = { uptime: 0, network: "Unknown", status: "Online" };
  try {
    const res = await api.authFetch("/api/system/status");
    if (res.ok) sysStatus = await res.json();
  } catch (err) {
    console.warn("Could not load system status:", err);
  }

  function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  }
  
  function formatCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  $content.innerHTML = `
      <div class="fade-in max-w-6xl mx-auto py-4 flex flex-col" style="min-height: calc(100vh - 100px);">
        <div class="mb-10 text-left" style="padding: 0 10px;">
          <h1 class="text-4xl sm:text-5xl font-extrabold mb-2 tracking-tight flex flex-col gap-1">
            <span>Your Library</span>
          </h1>
          <p class="text-base sm:text-lg mb-2" style="color: rgba(255, 255, 255, 0.7);">
            All your entertainment. One place.
          </p>
          <p class="text-xs sm:text-sm font-medium" style="color: var(--text-secondary);">
            ${libs.length} collections &nbsp;·&nbsp; ${libs.reduce((a, l) => a + (l.fileCount || 0), 0)} total files
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children justify-center mx-auto w-full flex-grow content-start">
          ${libs.map((lib, i) => renderLibraryCard(lib, i)).join("")}
        </div>
        
        <div class="mt-auto pt-12 pb-4 w-full">
          <div class="p-5 rounded-2xl flex flex-wrap items-center justify-between gap-6 w-full" style="background: rgba(20, 20, 35, 0.5); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);">
            <div class="flex items-center gap-4">
              <div class="opacity-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
              </div>
              <div>
                <div class="text-xs mb-0.5" style="color: var(--text-tertiary);">Server Status</div>
                <div class="text-sm font-medium flex items-center gap-2">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${sysStatus.status === 'Online' ? '#22c55e' : '#ef4444'}; box-shadow: 0 0 8px ${sysStatus.status === 'Online' ? '#22c55e' : '#ef4444'}; display: inline-block;"></div>
                  <span>${sysStatus.status}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="opacity-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              </div>
              <div>
                <div class="text-xs mb-0.5" style="color: var(--text-tertiary);">Network</div>
                <div class="text-sm font-medium text-white">${sysStatus.network}</div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="opacity-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <div class="text-xs mb-0.5" style="color: var(--text-tertiary);">Uptime</div>
                <div class="text-sm font-medium text-white">${formatUptime(sysStatus.uptime)}</div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="opacity-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <div>
                <div class="text-xs mb-0.5" style="color: var(--text-tertiary);">Current Time</div>
                <div class="text-sm font-medium text-white">${formatCurrentTime()}</div>
              </div>
            </div>
          </div>
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
  
  // Clean library name to match background image filenames (e.g. "TV Shows" -> "tvshows")
  const bgName = lib.name.toLowerCase().replace(/[^a-z]/g, "");
  const bgImage = `/img/bg_${bgName}.png`;

  return `
      <div class="glass-card p-6 flex flex-col justify-between ${configured ? "" : "opacity-50"}" data-glow="${glow}" data-library="${escapeHtml(lib.name)}" id="library-card-${index}" style="min-height: 280px; border-radius: 16px; background-image: linear-gradient(to bottom, rgba(15, 12, 41, 0.5) 0%, rgba(48, 43, 99, 0.8) 50%, rgba(36, 36, 62, 0.95) 100%), url('${bgImage}'); background-size: cover; background-position: center; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.6); transition: all 0.3s ease; position: relative; overflow: hidden;">
        <div class="flex items-start justify-between mb-8 relative z-10">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center icon-box" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1);">
            ${icon}
          </div>
          ${statusPill}
        </div>
        <div class="relative z-10 flex flex-col flex-grow justify-end">
          <h3 class="text-xl font-bold mb-1 tracking-tight text-white">${escapeHtml(lib.name)}</h3>
          <p class="text-sm mb-4" style="color: rgba(255,255,255,0.6);">
            ${escapeHtml(lib.description || typeLabel)}
          </p>
          <div class="flex items-center justify-between mt-auto">
            <span class="text-xs font-medium uppercase tracking-wider" style="color: rgba(255,255,255,0.5);">${typeLabel}</span>
            ${configured && count > 0 ? `<span class="text-xs font-semibold text-white tracking-wide">Browse →</span>` : ""}
          </div>
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
              ${isAudio ? renderAudioList(viewLibrary, directFiles) : directFiles.map((f) => renderMediaItem(viewLibrary, f, viewLibrary.files.indexOf(f))).join("")}
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
    attachLazyMetadataObserver(viewLibrary);
  } else {
    attachAudioClickHandlers(viewLibrary);
  }
}

// -----------------------------------------------------------------------
// Lazy Loading Metadata Observer
// -----------------------------------------------------------------------
function attachLazyMetadataObserver(library) {
  const observer = new IntersectionObserver(async (entries, obs) => {
    for (let entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target;
        obs.unobserve(el);
        el.classList.remove('lazy-meta');

        const filename = el.dataset.filename;
        const index = el.dataset.index;

        try {
          const res = await api.authFetch(`/api/metadata/info?filename=${encodeURIComponent(filename)}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          if (data.metadata) {
            updateMediaCard(el, library, filename, index, data.metadata);
          } else {
            // No metadata found: gracefully fallback to standard media-item UI
            const file = library.files[index];
            el.outerHTML = renderMediaItemFallback(library, file, index);
            // Re-attach click listener because outerHTML destroys it
            const newEl = document.getElementById(`media-item-${index}`);
            if (newEl) newEl.addEventListener("click", () => openMediaViewer(library, parseInt(index, 10)));
          }
        } catch (e) {
          console.error("Lazy load error", e);
          el.innerHTML = `<div style="background:red;color:white;padding:10px;font-size:12px;z-index:9999;position:absolute;inset:0;">ERROR: ${e.message}</div>`;
        }
      }
    }
  }, { rootMargin: '100px' });

  document.querySelectorAll('.lazy-meta').forEach(el => observer.observe(el));
}

function updateMediaCard(el, library, filename, index, meta) {
  const poster = meta.posterUrl || el.querySelector('img').src;
  const rating = meta.rating ? `<div class="badge-rating">⭐ ${meta.rating}</div>` : "";
  const year = meta.releaseYear ? `<div class="badge-year">${meta.releaseYear}</div>` : "";

  el.innerHTML = `
        <img class="${meta.posterUrl ? 'media-card-poster' : 'media-card-thumbnail'}" src="${poster}" alt="${escapeHtml(meta.title)}" loading="lazy">
        <button class="btn-fix-match" onclick="event.stopPropagation(); window.openFixMatchDialog('${escapeHtml(filename).replace(/'/g, "\\'")}')">Fix Match</button>
        <div class="media-card-overlay">
          <div class="media-card-badges">${rating}${year}</div>
          <div class="media-card-title">${escapeHtml(meta.title)}</div>
          <div class="media-card-desc">${escapeHtml(meta.overview || "No description available.")}</div>
        </div>
    `;

  // Replace the default click handler with the Details UI
  // We clone to strip old event listeners attached by attachMediaClickHandlers
  const newEl = el.cloneNode(true);
  el.parentNode.replaceChild(newEl, el);
  newEl.addEventListener("click", () => openMediaDetails(library, parseInt(index, 10), filename, meta));
}

// -----------------------------------------------------------------------
// Media Details UI
// -----------------------------------------------------------------------
function openMediaDetails(library, index, filename, meta) {
  const file = library.files[index];
  const thumbUrl = api.thumbnailUrl(library.name, file.relativePath, 500);
  const posterUrl = meta.posterUrl || thumbUrl;

  const html = `
    <div id="media-details-view" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#070913; display:flex; flex-direction:column; overflow-y:auto;">
      <div class="backdrop-background" style="position:absolute; top:0; left:0; right:0; bottom:0; background-image:url('${meta.backdropUrl || posterUrl}'); background-size:cover; background-position:center; filter:blur(20px) brightness(0.3); z-index:0;"></div>
      
      <div style="position:relative; z-index:1; padding:20px; display:flex; gap:20px;">
        <button onclick="document.getElementById('media-details-view').remove()" style="background:transparent; border:none; color:white; font-size:1.5rem; cursor:pointer;">${ICONS.back || '←'}</button>
      </div>

      <div style="position:relative; z-index:1; flex:1; display:flex; gap:40px; padding: 40px 10%; align-items:center;">
        <img src="${posterUrl}" style="width:300px; border-radius:12px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        
        <div style="flex:1;">
          <h1 style="font-size:3rem; font-weight:800; margin-bottom:10px; line-height:1.1;">${escapeHtml(meta.title)}</h1>
          
          <div style="display:flex; gap:15px; margin-bottom:20px; align-items:center;">
            ${meta.rating ? `<div class="badge-rating" style="font-size:1rem; padding:4px 10px;">⭐ ${meta.rating}</div>` : ''}
            ${meta.releaseYear ? `<div class="badge-year" style="font-size:1rem; padding:4px 10px;">${meta.releaseYear}</div>` : ''}
          </div>
          
          <p style="font-size:1.1rem; line-height:1.6; color:rgba(255,255,255,0.8); margin-bottom:40px;">
            ${escapeHtml(meta.overview || "No description available.")}
          </p>
          
          <div style="display:flex; gap:20px;">
            <button id="details-play-btn" class="btn btn-primary" style="padding: 15px 40px; font-size:1.2rem;">▶ Play</button>
            <button onclick="window.openFixMatchDialog('${escapeHtml(filename).replace(/'/g, "\\'")}')" class="btn btn-secondary" style="padding: 15px 30px;">Fix Match</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('details-play-btn').addEventListener('click', () => {
    document.getElementById('media-details-view').remove();
    openMediaViewer(library, index);
  });
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
  if (isVideo) {
    const thumbUrl = api.thumbnailUrl(library.name, file.relativePath, 500);
    const nameNoExt = file.name.replace(/\.[^.]+$/, "");
    return `
      <div class="media-card lazy-meta" data-index="${index}" data-filename="${escapeHtml(file.relativePath).replace(/"/g, "&quot;")}" id="media-item-${index}">
        <img class="media-card-thumbnail" src="${thumbUrl}" alt="${escapeHtml(file.name)}" loading="lazy">
        <div class="media-card-overlay">
          <div class="media-card-title">${escapeHtml(nameNoExt)}</div>
          <div class="media-card-desc" style="color: var(--text-tertiary);">Loading details...</div>
        </div>
      </div>
    `;
  }
  return renderMediaItemFallback(library, file, index);
}

function renderMediaItemFallback(library, file, index) {
  const isImage = file.type === "image";
  const isVideo = file.type === "video";
  const thumbUrl = (isImage || isVideo) ? api.thumbnailUrl(library.name, file.relativePath, 500) : "";
  const nameNoExt = file.name.replace(/\.[^.]+$/, "");
  const ext = getFileExtension(file.name);

  return `
      <div class="media-item" data-index="${index}" data-name="${escapeHtml(file.name.toLowerCase())}" id="media-item-${index}">
        ${isImage || isVideo ? `
          <img 
            class="media-item__thumb" 
            src="${thumbUrl}" 
            alt="${escapeHtml(file.name)}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          >
          <div class="media-item__thumb fallback-thumb flex items-center justify-center" style="background: var(--surface-2); display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;">
            <div class="text-center">
              <div class="mb-2 opacity-40">${isVideo ? ICONS.film : ICONS.folder}</div>
              <span class="pill pill--blue text-xs">${ext}</span>
            </div>
          </div>
        ` : `
          <div class="media-item__thumb flex items-center justify-center" style="background: var(--surface-2);">
            <div class="text-center">
              <div class="mb-2 opacity-40">${ICONS.folder}</div>
              <span class="pill pill--blue text-xs">${ext}</span>
            </div>
          </div>
        `}
        ${isVideo ? `
          <div class="media-item__overlay flex-col gap-2" style="z-index: 5; flex-direction: column;">
            <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(139, 92, 246, 0.7); backdrop-filter: blur(6px);">
              ${ICONS.play}
            </div>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); window.openFixMatchDialog('${escapeHtml(file.relativePath).replace(/'/g, "\\'")}')" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 12px; backdrop-filter: blur(4px); background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.2);">Fix Match</button>
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
      <div class="media-grid media-grid--music px-4">
        ${library.files.map((f, i) => {
    const nameNoExt = f.name.replace(/\.[^.]+$/, "");
    const ext = getFileExtension(f.name);
    const coverUrl = "/api/music/cover/" + encodeURIComponent(library.name) + "/" + encodeURIComponent(f.relativePath);
    return `
            <div class="media-item audio-item flex flex-col items-center" data-index="${i}" data-name="${escapeHtml(f.name.toLowerCase())}" id="audio-item-${i}">
              <div class="w-full relative shadow-[0_15px_35px_rgba(0,0,0,0.5)] group overflow-hidden" style="aspect-ratio: 1/1; border-radius: 28px;">
                <img 
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  src="${coverUrl.replace(/'/g, "%27")}" 
                  alt="${escapeHtml(f.name)}"
                  loading="lazy"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="fallback-thumb flex items-center justify-center w-full h-full transition-transform duration-300 group-hover:scale-105" style="background: var(--surface-2); display:none; position:absolute; top:0; left:0;">
                  <div class="text-center text-white/40" style="width: 80px; height: 80px;">
                    ${ICONS.music}
                  </div>
                </div>
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center" style="background: rgba(139, 92, 246, 0.8); backdrop-filter: blur(8px);">
                    ${ICONS.play}
                  </div>
                </div>
              </div>
              <div class="media-item__info w-full">
                <div class="media-item__name" title="${escapeHtml(f.name)}">${escapeHtml(nameNoExt)}</div>
                <div class="media-item__meta">${formatSize(f.size)} · ${ext}</div>
              </div>
            </div>
          `;
  }).join("")}
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
  document.querySelectorAll(".media-item:not(.audio-item), .media-card:not(.audio-item)").forEach((item) => {
    item.addEventListener("click", () => {
      const index = parseInt(item.dataset.index, 10);
      openMediaViewer(library, index);
    });
  });
}

function attachAudioClickHandlers(library) {
  document.querySelectorAll(".audio-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".audio-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      const index = parseInt(item.dataset.index, 10);
      if (window.MusicPlayer) {
        window.MusicPlayer.play(library, index);
      } else {
        console.error("MusicPlayer not initialized");
      }
    });
  });
}

// -----------------------------------------------------------------------
// Fix Match Dialog Logic
// -----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const dialogHtml = `
    <div id="metadata-search-dialog">
      <div class="search-dialog-content">
        <div class="search-dialog-header">
          <input type="text" id="metadata-search-input" class="search-dialog-input" placeholder="Search TMDB for movie or TV show...">
          <button id="metadata-search-btn" class="btn btn-primary" style="padding: 10px 15px;">Search</button>
          <button id="metadata-search-close" style="background:transparent; border:none; color:white; cursor:pointer;">✖</button>
        </div>
        <div style="padding: 10px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2);">
          <input type="checkbox" id="metadata-apply-folder" checked style="accent-color: var(--accent-color); cursor: pointer;">
          <label for="metadata-apply-folder" style="font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; user-select: none;">Apply to all files in this folder</label>
        </div>
        <div class="search-dialog-results" id="metadata-search-results">
          <div style="text-align:center; padding: 20px; color: var(--text-tertiary);">Search for a title to fix the metadata match.</div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", dialogHtml);

  const dialog = document.getElementById("metadata-search-dialog");
  const closeBtn = document.getElementById("metadata-search-close");
  const searchBtn = document.getElementById("metadata-search-btn");
  const input = document.getElementById("metadata-search-input");
  const resultsContainer = document.getElementById("metadata-search-results");
  let currentTargetFilename = null;

  closeBtn.addEventListener("click", () => {
    dialog.style.display = "none";
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.style.display = "none";
  });

  window.openFixMatchDialog = (filename) => {
    currentTargetFilename = filename;
    const basename = filename.split('/').pop().split('\\').pop();
    input.value = basename.replace(/\.[^.]+$/, "");
    resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-tertiary);">Hit search to find matches for:<br><strong>${escapeHtml(basename)}</strong></div>`;
    dialog.style.display = "flex";
  };

  searchBtn.addEventListener("click", async () => {
    const query = input.value.trim();
    if (!query) return;

    resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px;">Searching TMDB...</div>`;
    try {
      const res = await api.authFetch(`/api/metadata/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        resultsContainer.innerHTML = data.results.map(r => `
          <div class="search-result-item" onclick="window.applyMetadataOverride('${r.id}', '${r.type}')">
            ${r.posterUrl ? `<img src="${r.posterUrl}" class="search-result-poster">` : `<div class="search-result-poster"></div>`}
            <div>
              <div style="font-weight: bold; margin-bottom: 4px;">${escapeHtml(r.title)} <span style="color:var(--text-tertiary); font-weight:normal;">(${r.releaseYear || '?'})</span></div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(r.overview || '')}</div>
            </div>
          </div>
        `).join("");
      } else {
        resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-tertiary);">No results found.</div>`;
      }
    } catch (e) {
      resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">Error searching TMDB.</div>`;
    }
  });

  window.applyMetadataOverride = async (tmdbId, type) => {
    if (!currentTargetFilename) return;
    const applyToFolder = document.getElementById("metadata-apply-folder").checked;
    resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px;">Applying fix...</div>`;
    try {
      await api.authFetch("/api/metadata/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: currentTargetFilename, tmdbId, type, applyToFolder })
      });
      dialog.style.display = "none";
      // Refresh library to show new metadata
      if (state.currentLibrary) {
        renderLibrary(state.currentLibrary.name);
      }
    } catch (e) {
      resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">Error applying override.</div>`;
    }
  };
});

// -----------------------------------------------------------------------