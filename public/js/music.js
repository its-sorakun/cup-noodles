window.MusicPlayer = {
  queue: [],
  currentIndex: 0,
  audio: new Audio(),
  shuffle: false,
  repeat: 0, // 0: off, 1: list, 2: track
  library: null,

  init() {
    this.createDOM();
    
    // Attach audio events
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onTrackEnd());
    this.audio.addEventListener('loadedmetadata', () => this.updateProgress());
    this.audio.addEventListener('play', () => this.updatePlayState());
    this.audio.addEventListener('pause', () => this.updatePlayState());
  },

  createDOM() {
    const html = `
      <div class="music-player-drawer" id="music-drawer">
        <div class="music-player-backdrop" id="music-backdrop"></div>
        
        <div class="music-content-wrapper">
          <div class="music-main-panel">
            <button class="music-circle-btn" id="music-close" title="Minimize" style="position: absolute; top: 20px; left: 20px; z-index: 10;">${window.ICONS?.chevronDown || 'v'}</button>
            <button class="music-circle-btn" id="music-toggle-sidebar" title="Toggle Sidebar" style="position: absolute; top: 20px; right: 20px; z-index: 10;">${window.ICONS?.list || '≡'}</button>
            
            <div class="music-cover" id="music-cover"></div>
            
            <div class="music-info-container">
              <div class="music-title" id="music-title">Song Title</div>
              <div class="music-artist" id="music-artist">Artist</div>
              <div class="music-tech-badge" id="music-tech">MP3 · 320kbps</div>
            </div>
            
            <div class="music-progress-wrapper">
              <span id="music-time-current">0:00</span>
              <input type="range" class="music-progress-bar" id="music-progress" value="0" min="0" max="100">
              <span id="music-time-total">0:00</span>
            </div>
            
            <div class="music-controls">
              <button class="music-btn" id="music-shuffle" title="Shuffle">${window.ICONS?.shuffle || 'S'}</button>
              <button class="music-btn" id="music-prev" title="Previous">${window.ICONS?.skipBack || 'Prev'}</button>
              <button class="music-btn music-btn-main" id="music-play" title="Play/Pause">${window.ICONS?.play || 'Play'}</button>
              <button class="music-btn" id="music-next" title="Next">${window.ICONS?.skipForward || 'Next'}</button>
              <button class="music-btn" id="music-repeat" title="Repeat">${window.ICONS?.repeat || 'R'}</button>
            </div>
          </div>
          
          <div class="music-sidebar" id="music-sidebar">
            <div class="music-tabs">
              <div class="music-tab active" data-target="queue">Up Next</div>
              <div class="music-tab" data-target="lyrics">Lyrics</div>
            </div>
            
            <div class="music-tab-content active" id="music-tab-queue">
              <!-- Queue items go here -->
            </div>
            
            <div class="music-tab-content" id="music-tab-lyrics">
              <div class="lyrics-text" id="music-lyrics-text">Loading lyrics...</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="music-mini-player" id="music-mini" style="display: none;">
        <div class="music-mini-backdrop" id="music-mini-backdrop"></div>
        <div class="music-mini-cover-container" id="music-mini-maximize">
          <img class="music-mini-cover" id="music-mini-cover" src="" alt="">
        </div>
        <div class="music-mini-info" id="music-mini-maximize-info">
          <div class="music-mini-title" id="music-mini-title">Song Title</div>
          <div class="music-mini-artist" id="music-mini-artist">Artist</div>
        </div>
        <div class="music-mini-controls">
          <button class="music-mini-btn" id="music-mini-play">${window.ICONS?.playSmall || 'Play'}</button>
          <button class="music-mini-btn" id="music-mini-next">${window.ICONS?.skipForward || 'Next'}</button>
          <button class="music-mini-btn" id="music-mini-close">${window.ICONS?.x || '✖'}</button>
        </div>
        <div class="music-mini-progress-bg">
          <div class="music-mini-progress-fill" id="music-mini-progress"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.bindEvents();
    this.isMinimized = false;
  },

  bindEvents() {
    document.getElementById('music-close').addEventListener('click', () => this.minimize());
    document.getElementById('music-toggle-sidebar').addEventListener('click', () => {
      document.getElementById('music-sidebar').classList.toggle('collapsed');
    });
    
    document.getElementById('music-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('music-next').addEventListener('click', () => this.next());
    document.getElementById('music-prev').addEventListener('click', () => this.prev());
    document.getElementById('music-shuffle').addEventListener('click', () => this.toggleShuffle());
    document.getElementById('music-repeat').addEventListener('click', () => this.toggleRepeat());
    
    const progress = document.getElementById('music-progress');
    progress.addEventListener('input', (e) => {
      if (this.audio.duration) {
        this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
      }
    });

    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.music-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`music-tab-${tab.dataset.target}`).classList.add('active');
      });
    });

    // Mini Player Events
    document.getElementById('music-mini-maximize').addEventListener('click', () => this.maximize());
    document.getElementById('music-mini-maximize-info').addEventListener('click', () => this.maximize());
    document.getElementById('music-mini-close').addEventListener('click', () => this.close());
    document.getElementById('music-mini-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('music-mini-next').addEventListener('click', () => this.next());
  },

  minimize() {
    this.isMinimized = true;
    document.getElementById('music-drawer').classList.remove('open');
    document.getElementById('music-mini').style.display = 'flex';
  },

  maximize() {
    this.isMinimized = false;
    document.getElementById('music-mini').style.display = 'none';
    document.getElementById('music-drawer').classList.add('open');
  },

  close() {
    this.isMinimized = false;
    this.audio.pause();
    document.getElementById('music-drawer').classList.remove('open');
    document.getElementById('music-mini').style.display = 'none';
  },

  play(library, index) {
    this.library = library;
    this.queue = [...library.files];
    this.currentIndex = index;
    
    this.loadTrack(this.currentIndex);
    this.maximize();
  },

  async loadTrack(index) {
    const file = this.queue[index];
    if (!file) return;

    this.audio.src = api.streamUrl(this.library.name, file.relativePath);
    this.audio.play().catch(e => console.warn('Autoplay prevented', e));

    document.getElementById('music-title').textContent = file.name.replace(/\.[^.]+$/, "");
    document.getElementById('music-artist').textContent = "Loading...";
    document.getElementById('music-tech').textContent = "Loading info...";
    document.getElementById('music-cover').style.backgroundImage = '';
    document.getElementById('music-backdrop').style.backgroundImage = '';
    document.getElementById('music-lyrics-text').textContent = "Fetching lyrics...";
    
    this.updateQueueUI();

    try {
      const res = await api.authFetch(`/api/music/metadata/${encodeURIComponent(this.library.name)}/${encodeURIComponent(file.relativePath)}`);
      const meta = await res.json();
      
      document.getElementById('music-title').textContent = meta.title || file.name.replace(/\.[^.]+$/, "");
      document.getElementById('music-artist').textContent = meta.artist || "Unknown Artist";
      
      document.getElementById('music-mini-title').textContent = meta.title || file.name.replace(/\.[^.]+$/, "");
      document.getElementById('music-mini-artist').textContent = meta.artist || "Unknown Artist";
      
      const kbs = Math.round(meta.bitrate / 1000);
      const khz = (meta.sampleRate / 1000).toFixed(1);
      document.getElementById('music-tech').textContent = `${meta.codec.toUpperCase()} · ${meta.bitDepth}-bit · ${khz}kHz · ${kbs > 0 ? kbs + 'kbps' : 'Unknown'}`;

      const coverUrl = `/api/music/cover/${encodeURIComponent(this.library.name)}/${encodeURIComponent(file.relativePath)}`;
      document.getElementById('music-cover').style.backgroundImage = `url('${coverUrl.replace(/'/g, "%27")}')`;
      document.getElementById('music-backdrop').style.backgroundImage = `url('${coverUrl.replace(/'/g, "%27")}')`;
      document.getElementById('music-mini-cover').src = coverUrl;
      document.getElementById('music-mini-backdrop').style.backgroundImage = `url('${coverUrl.replace(/'/g, "%27")}')`;

      if (meta.artist && meta.title && meta.artist !== "Unknown Artist") {
        const lyricsRes = await api.authFetch(`/api/music/lyrics?artist=${encodeURIComponent(meta.artist)}&title=${encodeURIComponent(meta.title)}`);
        if (lyricsRes.ok) {
          const lyricsData = await lyricsRes.json();
          document.getElementById('music-lyrics-text').textContent = lyricsData.lyrics || "No lyrics found.";
        } else {
          document.getElementById('music-lyrics-text').textContent = "No lyrics found on Lyrics.ovh.";
        }
      } else {
        document.getElementById('music-lyrics-text').textContent = "Missing artist/title for lyrics search.";
      }
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  },

  updateProgress() {
    const current = this.audio.currentTime;
    const total = this.audio.duration;
    
    document.getElementById('music-time-current').textContent = this.formatTime(current);
    document.getElementById('music-time-total').textContent = isNaN(total) ? "0:00" : this.formatTime(total);
    
    if (!isNaN(total) && total > 0) {
      document.getElementById('music-progress').value = (current / total) * 100;
      document.getElementById('music-mini-progress').style.width = ((current / total) * 100) + '%';
    }
  },

  updatePlayState() {
    const playBtn = document.getElementById('music-play');
    const miniPlayBtn = document.getElementById('music-mini-play');
    if (this.audio.paused) {
      playBtn.innerHTML = window.ICONS?.play || 'Play';
      if(miniPlayBtn) miniPlayBtn.innerHTML = window.ICONS?.playSmall || 'Play';
    } else {
      playBtn.innerHTML = window.ICONS?.pause || 'Pause';
      if(miniPlayBtn) miniPlayBtn.innerHTML = window.ICONS?.pause || 'Pause';
    }
  },

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  },

  onTrackEnd() {
    if (this.repeat === 2) {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }
    this.next();
  },

  next() {
    if (this.shuffle) {
      this.currentIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.queue.length) {
        if (this.repeat === 1) this.currentIndex = 0;
        else { this.currentIndex = this.queue.length - 1; return; }
      }
    }
    this.loadTrack(this.currentIndex);
  },

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    this.currentIndex--;
    if (this.currentIndex < 0) this.currentIndex = 0;
    this.loadTrack(this.currentIndex);
  },

  togglePlay() {
    if (this.audio.paused) this.audio.play();
    else this.audio.pause();
  },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    const btn = document.getElementById('music-shuffle');
    if (this.shuffle) btn.classList.add('active');
    else btn.classList.remove('active');
  },

  toggleRepeat() {
    this.repeat = (this.repeat + 1) % 3;
    const btn = document.getElementById('music-repeat');
    if (this.repeat === 0) {
      btn.classList.remove('active');
      btn.innerHTML = window.ICONS?.repeat || 'R';
    } else if (this.repeat === 1) {
      btn.classList.add('active');
      btn.innerHTML = window.ICONS?.repeat || 'RA'; // Repeat All
    } else {
      btn.classList.add('active');
      btn.innerHTML = window.ICONS?.repeatOne || 'R1'; // Repeat One
    }
  },

  updateQueueUI() {
    const container = document.getElementById('music-tab-queue');
    container.innerHTML = this.queue.map((file, i) => {
      const isPlaying = i === this.currentIndex;
      const coverUrl = `/api/music/cover/${encodeURIComponent(this.library.name)}/${encodeURIComponent(file.relativePath)}`;
      return `
        <div class="queue-item ${isPlaying ? 'playing' : ''}" onclick="MusicPlayer.loadTrack(${i})">
          <div class="queue-item-cover" style="background-image: url('${coverUrl.replace(/'/g, "%27")}');"></div>
          <div class="queue-item-info">
            <div class="queue-item-title">${file.name.replace(/\.[^.]+$/, "")}</div>
            <div class="queue-item-artist">Click to play</div>
          </div>
        </div>
      `;
    }).join('');
  },

  formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Give views.js a moment to define ICONS
  setTimeout(() => {
    MusicPlayer.init();
  }, 100);
});
