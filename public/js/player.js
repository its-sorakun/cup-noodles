  // Media Viewer (Lightbox / Video Player with HLS transcoding)
  // -----------------------------------------------------------------------
  let currentViewerIndex = 0;
  let currentViewerLibrary = null;
  let currentTranscodeSessionId = null;
  let currentHlsInstance = null;

  function openMediaViewer(library, index) {
    currentViewerLibrary = library;
    currentViewerIndex = index;
    renderViewer();
  }

  async function startTranscodeAndPlay(library, file, quality) {
    const videoEl = document.getElementById("viewer-video");
    const statusEl = document.getElementById("transcode-status");
    if (!videoEl) return;

    // Capture current playback position before switching
    const savedTime = videoEl.currentTime || 0;

    // Kill any existing session
    if (currentTranscodeSessionId) {
      fetch(`/api/transcode/${currentTranscodeSessionId}`, { method: "DELETE" }).catch(() => {});
      currentTranscodeSessionId = null;
    }
    if (currentHlsInstance) {
      currentHlsInstance.destroy();
      currentHlsInstance = null;
    }

    if (quality === "direct") {
      // Direct stream — no transcoding
      if (statusEl) statusEl.textContent = "Direct stream";
      videoEl.src = api.streamUrl(library.name, file.relativePath);
      videoEl.load();
      // Restore timestamp once metadata is loaded
      if (savedTime > 0) {
        videoEl.addEventListener("loadedmetadata", () => {
          videoEl.currentTime = savedTime;
        }, { once: true });
      }
      videoEl.play().catch(() => {});
      return;
    }

    if (statusEl) statusEl.textContent = `Starting ${quality} transcode...`;
    videoEl.src = "";

    try {
      const res = await fetch("/api/transcode/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryName: library.name, relativePath: file.relativePath, quality, startTime: savedTime }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.details || errBody.error || "Failed to start transcode session");
      }
      const { sessionId } = await res.json();
      currentTranscodeSessionId = sessionId;

      const playlistUrl = `/api/transcode/${sessionId}/playlist.m3u8`;

      if (statusEl) statusEl.textContent = `Buffering ${quality} — building initial buffer...`;

      if (Hls.isSupported()) {
        // Android Chrome, Firefox, etc. — need hls.js
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1,
          // Playlist reload tuning for live transcoding
          liveSyncDurationCount: 3,          // stay 3 segments behind live edge
          levelLoadingMaxRetry: 10,          // retry playlist loads
          levelLoadingRetryDelay: 1000,      // 1s between retries
          manifestLoadingMaxRetry: 10,
          manifestLoadingRetryDelay: 2000,   // 2s between manifest retries
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          // Buffer settings
          maxBufferLength: 30,               // buffer up to 30s ahead
          maxMaxBufferLength: 60,
        });
        currentHlsInstance = hls;
        hls.loadSource(playlistUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (statusEl) statusEl.textContent = `Streaming ${quality}`;
          videoEl.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Try to recover from network errors
              if (statusEl) statusEl.textContent = `Recovering from network error...`;
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (statusEl) statusEl.textContent = `Recovering from media error...`;
              hls.recoverMediaError();
            } else {
              if (statusEl) statusEl.textContent = `HLS Error: ${data.type} — ${data.details}`;
            }
          }
        });
      } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari / iOS — native HLS support
        videoEl.src = playlistUrl;
        videoEl.addEventListener("loadedmetadata", () => {
          if (statusEl) statusEl.textContent = `Streaming ${quality}`;
          videoEl.play().catch(() => {});
        });
      } else {
        throw new Error("HLS not supported in this browser");
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = `Transcode failed: ${err.message}`;
    }
  }

  function renderViewer() {
    const library = currentViewerLibrary;
    const file = library.files[currentViewerIndex];
    const url = api.streamUrl(library.name, file.relativePath);
    const isImage = file.type === "image";
    const isVideo = file.type === "video";

    // Remove existing overlay if any
    closeViewer(false); // false = don’t kill session (we'll restart fresh)

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
          <div style="position:relative; max-width: 92vw;">
            <video id="viewer-video" controls style="max-width: 92vw; max-height: 75vh; border-radius: var(--radius-md); box-shadow: 0 25px 100px -20px rgba(0,0,0,0.8); display:block;"></video>
            <div style="margin-top: 10px; display:flex; flex-wrap:wrap; align-items:center; gap:8px; justify-content:center;">
              <span id="transcode-status" style="font-size:11px; color: var(--text-tertiary); font-family: monospace;">Select quality to start</span>
              <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
                ${["1080p","720p","480p","360p"].map(q => `
                  <button class="pill pill--blue transcode-quality-btn" data-quality="${q}" style="cursor:pointer; font-size:11px; padding:3px 10px;">${q}</button>
                `).join("")}
                <button class="pill transcode-quality-btn" data-quality="direct" style="cursor:pointer; font-size:11px; padding:3px 10px;" title="Direct stream — no transcoding, browser decodes">⚡ Direct</button>
              </div>
            </div>
          </div>
        ` : ""}
        <div class="text-center">
          <p class="text-sm font-medium">${escapeHtml(nameNoExt)}</p>
          <p class="text-xs mt-1" style="color: var(--text-tertiary);">${formatSize(file.size)} · ${getFileExtension(file.name)}</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close button
    document.getElementById("viewer-close").addEventListener("click", () => closeViewer(true));

    // Click outside to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeViewer(true);
    });

    // Quality selector buttons
    if (isVideo) {
      overlay.querySelectorAll(".transcode-quality-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Highlight selected
          overlay.querySelectorAll(".transcode-quality-btn").forEach(b => b.style.opacity = "0.5");
          btn.style.opacity = "1";
          startTranscodeAndPlay(library, file, btn.dataset.quality);
        });
      });
      // Auto-start at 720p by default
      setTimeout(() => {
        const btn720 = overlay.querySelector('[data-quality="720p"]');
        if (btn720) {
          btn720.style.opacity = "1";
          startTranscodeAndPlay(library, file, "720p");
        }
      }, 100);
    }

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
    if (e.key === "Escape") closeViewer(true);
    if (e.key === "ArrowLeft") navigateViewer(-1);
    if (e.key === "ArrowRight") navigateViewer(1);
  }

  function closeViewer(killSession = true) {
    const overlay = document.getElementById("media-viewer-overlay");
    if (overlay) overlay.remove();
    document.removeEventListener("keydown", viewerKeyHandler);

    if (killSession) {
      if (currentHlsInstance) {
        currentHlsInstance.destroy();
        currentHlsInstance = null;
      }
      if (currentTranscodeSessionId) {
        fetch(`/api/transcode/${currentTranscodeSessionId}`, { method: "DELETE" }).catch(() => {});
        currentTranscodeSessionId = null;
      }
    }
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