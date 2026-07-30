  // Media Viewer (Lightbox / Video Player with HLS transcoding)
  // -----------------------------------------------------------------------
  
  if (!document.getElementById("custom-player-styles")) {
    const style = document.createElement("style");
    style.id = "custom-player-styles";
    style.innerHTML = `
      @keyframes spin-local { 100% { transform: rotate(360deg); } }
      .spin-anim { animation: spin-local 1s linear infinite; }
      
      .player-fullscreen-container { position: relative; width: 100%; max-width: 92vw; border-radius: var(--radius-md); overflow: hidden; box-shadow: 0 25px 100px -20px rgba(0,0,0,0.8); background: black; }
      .player-fullscreen-container:fullscreen { max-width: none !important; width: 100% !important; height: 100% !important; border-radius: 0; display: flex; align-items: center; justify-content: center; }
      .player-fullscreen-container:-webkit-full-screen { max-width: none !important; width: 100% !important; height: 100% !important; border-radius: 0; display: flex; align-items: center; justify-content: center; }
      .player-fullscreen-container:fullscreen video { max-height: none !important; width: 100% !important; height: 100% !important; object-fit: contain; }
      .player-fullscreen-container:-webkit-full-screen video { max-height: none !important; width: 100% !important; height: 100% !important; object-fit: contain; }
      
      .player-fullscreen-container { cursor: default; }
      .player-fullscreen-container.hide-controls { cursor: none; }
      .player-fullscreen-container.hide-controls #video-controls-wrapper { opacity: 0; pointer-events: none; }
      .player-fullscreen-container.hide-controls #quality-popup { opacity: 0; pointer-events: none; }
      #video-controls-wrapper { opacity: 1; transition: opacity 0.4s ease; }
      
      #seek-bar {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        outline: none;
        transition: height 0.2s, transform 0.2s;
        margin-bottom: 8px;
        cursor: pointer;
      }
      #seek-bar:hover { height: 6px; }
      #seek-bar::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        transition: transform 0.2s;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }
      #seek-bar:hover::-webkit-slider-thumb { transform: scale(1.2); }
      
      #quality-popup {
        position: absolute;
        bottom: 75px;
        right: 20px;
        background: rgba(20, 20, 20, 0.85);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform: translateY(10px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        z-index: 30;
      }
      #quality-popup.show {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }
      .quality-option {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.7);
        padding: 6px 16px;
        font-size: 13px;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        transition: background 0.2s, color 0.2s;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .quality-option:hover {
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .quality-option.active {
        color: white;
        background: rgba(255,255,255,0.15);
      }
    `;
    document.head.appendChild(style);
  }

  let currentViewerIndex = 0;
  let currentViewerLibrary = null;
  let currentTranscodeSessionId = null;
  let currentHlsInstance = null;
  let currentStreamBaseTime = 0;
  let totalDuration = 0;
  let currentQuality = "direct";

  function openMediaViewer(library, index) {
    currentViewerLibrary = library;
    currentViewerIndex = index;
    renderViewer();
  }

  async function startTranscodeAndPlay(library, file, quality, explicitStartTime = null) {
    const videoEl = document.getElementById("viewer-video");
    const statusEl = document.getElementById("transcode-status");
    const loadingOverlay = document.getElementById("video-loading-overlay");
    const loadingText = document.getElementById("video-loading-text");
    if (!videoEl) return;

    function setStatus(msg, showLoading = true) {
      if (statusEl) statusEl.textContent = msg;
      if (loadingText) loadingText.textContent = msg;
      if (loadingOverlay) loadingOverlay.style.display = showLoading ? "flex" : "none";
    }

    currentQuality = quality;

    // Capture absolute playback position across quality switches
    const playheadTime = videoEl.currentTime || 0;
    const actualTime = explicitStartTime !== null ? explicitStartTime : (currentStreamBaseTime + playheadTime);

    // Kill any existing session
    if (currentTranscodeSessionId) {
      api.authFetch(`/api/transcode/${currentTranscodeSessionId}`, { method: "DELETE" }).catch(() => {});
      currentTranscodeSessionId = null;
    }
    if (currentHlsInstance) {
      currentHlsInstance.destroy();
      currentHlsInstance = null;
    }

    if (quality === "direct") {
      // Direct stream — no transcoding
      setStatus("Direct stream", true);
      videoEl.src = api.streamUrl(library.name, file.relativePath);
      videoEl.load();
      // Restore timestamp once metadata is loaded
      currentStreamBaseTime = 0; // Direct stream time is always absolute
      if (actualTime > 0) {
        videoEl.addEventListener("loadedmetadata", () => {
          videoEl.currentTime = actualTime;
        }, { once: true });
      }
      videoEl.play().catch(() => {});
      return;
    }

    currentStreamBaseTime = actualTime;

    setStatus(`Starting ${quality} transcode...`, true);
    videoEl.src = "";

    try {
      const res = await api.authFetch("/api/transcode/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryName: library.name, relativePath: file.relativePath, quality, startTime: actualTime }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.details || errBody.error || "Failed to start transcode session");
      }
      const { sessionId, duration } = await res.json();
      currentTranscodeSessionId = sessionId;
      if (duration && duration > 0) {
        totalDuration = duration;
      }

      const playlistUrl = `${api.API_BASE}/api/transcode/${sessionId}/playlist.m3u8`;

      setStatus(`Buffering ${quality}...`, true);

      if (Hls.isSupported()) {
        // Android Chrome, Firefox, etc. — need hls.js
        const hls = new Hls({
          xhrSetup: function(xhr, url) {
            const token = localStorage.getItem("jwt_token");
            if (token) {
              xhr.setRequestHeader("Authorization", "Bearer " + token);
            }
          },
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
        let networkErrorCount = 0;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                // Try to recover from network errors a few times
                if (statusEl) statusEl.textContent = `Recovering from network error (${networkErrorCount}/3)...`;
                setTimeout(() => hls.startLoad(), 1000);
              } else {
                if (statusEl) statusEl.textContent = `Transcode failed: Network error limit reached.`;
                hls.destroy();
                closeViewer(true);
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (statusEl) statusEl.textContent = `Recovering from media error...`;
              hls.recoverMediaError();
            } else {
              if (statusEl) statusEl.textContent = `HLS Fatal Error: ${data.details}`;
              hls.destroy();
            }
          }
        });
      } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        // Native iOS fallback
        const token = localStorage.getItem("jwt_token");
        videoEl.src = token ? `${playlistUrl}?token=${token}` : playlistUrl;
        
        videoEl.addEventListener("loadedmetadata", () => {
          setStatus("", false);
          videoEl.play().catch(() => {});
        }, { once: true });
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
    currentStreamBaseTime = 0;

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
          <div style="max-width: 92vw; width: 100%; display:flex; flex-direction:column; align-items:center;">
            
            <div id="video-player-container" class="player-fullscreen-container">
              <video id="viewer-video" style="max-height: 75vh; display:block; width:100%; outline:none;"></video>
              
              <div id="video-loading-overlay" style="position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); z-index:10; pointer-events:none;">
                 <div style="display:flex; flex-direction:column; align-items:center; gap:12px; padding: 25px 35px; background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.25); border-radius: 16px; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <svg class="spin-anim" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span id="video-loading-text" style="color:white; font-size:15px; font-weight:600; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">Buffering...</span>
                 </div>
              </div>

              <div id="quality-popup">
                <span id="transcode-status" style="font-size:11px; color:rgba(255,255,255,0.5); font-family:monospace; margin-bottom:4px; text-align:center;">Select quality</span>
                ${["1080p","720p","480p","360p"].map(q => `
                  <button class="quality-option transcode-quality-btn" data-quality="${q}"><span>${q}</span></button>
                `).join("")}
                <button class="quality-option transcode-quality-btn" data-quality="direct" title="Direct stream — no transcoding, browser decodes"><span>Direct</span> <span style="font-size:10px; opacity:0.6;">⚡</span></button>
              </div>
              
              <div id="video-controls-wrapper" style="position:absolute; bottom:0; left:0; width:100%; padding: 40px 0 0 0; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 50%, transparent); display:flex; flex-direction:column; justify-content:flex-end; z-index:20;">
                <input type="range" id="seek-bar" value="0" step="1">
                <div style="display:flex; align-items:center; justify-content:space-between; padding: 0 20px 20px 20px; width:100%;">
                  <div style="display:flex; align-items:center; gap:16px;">
                    <button id="play-pause-btn" class="hover:scale-110 transition-all text-white" style="cursor:pointer; display:flex; align-items:center; justify-content:center;">${ICONS.playSmall}</button>
                    <span id="time-display" style="color:white; font-size:13px; font-weight:600; font-family:monospace; min-width:90px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">0:00 / 0:00</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:16px;">
                    <button id="settings-btn" class="hover:scale-110 transition-all text-white" style="cursor:pointer; display:flex; align-items:center; justify-content:center;">${ICONS.settings}</button>
                    <button id="fullscreen-btn" class="hover:scale-110 transition-all text-white" style="cursor:pointer; display:flex; align-items:center; justify-content:center;">${ICONS.maximize}</button>
                  </div>
                </div>
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
      const popup = document.getElementById("quality-popup");
      overlay.querySelectorAll(".transcode-quality-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          overlay.querySelectorAll(".transcode-quality-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          if (popup) popup.classList.remove("show");
          startTranscodeAndPlay(library, file, btn.dataset.quality);
        });
      });

      // Custom Controls Logic
      const videoEl = document.getElementById("viewer-video");
      const playBtn = document.getElementById("play-pause-btn");
      const timeDisp = document.getElementById("time-display");
      const seekBar = document.getElementById("seek-bar");
      const fsBtn = document.getElementById("fullscreen-btn");
      const settingsBtn = document.getElementById("settings-btn");
      const playerContainer = document.getElementById("video-player-container");

      // Auto-hide controls
      let hideTimeout = null;
      function showControls() {
        if (playerContainer) playerContainer.classList.remove("hide-controls");
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (!videoEl.paused) playerContainer.classList.add("hide-controls");
        }, 2500);
      }
      if (playerContainer) {
        playerContainer.addEventListener("mousemove", showControls);
        playerContainer.addEventListener("mouseleave", () => {
          if (!videoEl.paused) playerContainer.classList.add("hide-controls");
        });
        videoEl.addEventListener("play", showControls);
      }

      // Settings popup toggle
      if (settingsBtn && popup) {
        settingsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          popup.classList.toggle("show");
        });
      }

      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (videoEl.paused) videoEl.play();
        else videoEl.pause();
      });

      videoEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (videoEl.paused) videoEl.play();
        else videoEl.pause();
      });

      videoEl.addEventListener("play", () => playBtn.innerHTML = ICONS.pause);
      videoEl.addEventListener("pause", () => playBtn.innerHTML = ICONS.playSmall);
      
      videoEl.addEventListener("playing", () => {
        const loadingOverlay = document.getElementById("video-loading-overlay");
        if (loadingOverlay) loadingOverlay.style.display = "none";
      });

      videoEl.addEventListener("waiting", () => {
        const loadingOverlay = document.getElementById("video-loading-overlay");
        const loadingText = document.getElementById("video-loading-text");
        if (loadingOverlay) {
          if (loadingText) loadingText.textContent = "Buffering...";
          loadingOverlay.style.display = "flex";
        }
      });
      
      videoEl.addEventListener("loadedmetadata", () => {
        if (currentQuality === "direct") {
          totalDuration = videoEl.duration;
        }
      });

      videoEl.addEventListener("timeupdate", () => {
        if (isNaN(totalDuration) || totalDuration <= 0) return;
        const globalTime = currentStreamBaseTime + (videoEl.currentTime || 0);
        timeDisp.textContent = formatTime(globalTime) + " / " + formatTime(totalDuration);
        seekBar.max = totalDuration;
        seekBar.value = globalTime;
      });

      seekBar.addEventListener("input", (e) => {
        e.stopPropagation();
        const newTime = parseFloat(e.target.value);
        timeDisp.textContent = formatTime(newTime) + " / " + formatTime(totalDuration);
      });

      seekBar.addEventListener("change", (e) => {
        e.stopPropagation();
        const newTime = parseFloat(e.target.value);
        if (currentQuality === "direct") {
          videoEl.currentTime = newTime;
        } else {
          const relativeTime = newTime - currentStreamBaseTime;
          // Check if the seek target is safely within the currently buffered HLS chunk
          if (relativeTime >= 0 && relativeTime <= (videoEl.duration || 0) - 2) {
            videoEl.currentTime = relativeTime;
          } else {
            // Seek outside buffer! Destroy current session and spawn a new one exactly at newTime
            startTranscodeAndPlay(library, file, currentQuality, newTime);
          }
        }
      });

      fsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (videoEl.requestFullscreen) videoEl.requestFullscreen();
        else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
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
    if (e.code === "Space") {
      const videoEl = document.getElementById("viewer-video");
      if (videoEl) {
        e.preventDefault();
        if (videoEl.paused) videoEl.play();
        else videoEl.pause();
      }
    }
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
        api.authFetch(`/api/transcode/${currentTranscodeSessionId}`, { method: "DELETE" }).catch(() => {});
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
    let cacheStats = { size: 0, count: 0 };
    try {
      config = await api.getConfig();
      try {
        const statsRes = await api.authFetch("/api/thumbnails/cache");
        cacheStats = await statsRes.json();
      } catch (e) { console.warn("Could not load cache stats"); }
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

        <div class="glass p-5 mt-8">
          <h3 class="text-sm font-semibold mb-3">Storage & Cache</h3>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium flex items-center gap-2">
                Thumbnail Cache 
                <span class="pill pill--purple text-[10px] py-0.5" id="cache-stats-badge">${cacheStats.count} files (${formatSize(cacheStats.size)})</span>
              </p>
              <p class="text-xs" style="color: var(--text-tertiary);">Clear cached video and image thumbnails to free up disk space.</p>
            </div>
            <button class="btn-glass" id="clear-cache-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach clear cache handler
    const clearBtn = document.getElementById("clear-cache-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        clearBtn.disabled = true;
        clearBtn.textContent = "Clearing...";
        try {
          const res = await api.authFetch("/api/thumbnails/cache", { method: "DELETE" });
          const data = await res.json();
          showToast(`Cleared ${data.cleared || 0} cached thumbnails`);
          clearBtn.textContent = "Cleared!";
          const badge = document.getElementById("cache-stats-badge");
          if (badge) badge.textContent = "0 files (0 B)";
          setTimeout(() => {
            clearBtn.textContent = "Clear Cache";
            clearBtn.disabled = false;
          }, 2000);
        } catch (e) {
          clearBtn.textContent = "Error";
          clearBtn.disabled = false;
        }
      });
    }

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