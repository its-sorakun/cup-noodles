window.MusicPlayer = {
  queue: [],
  currentIndex: 0,
  audio: new Audio(),
  shuffle: false,
  repeat: 0, // 0: off, 1: list, 2: track
  library: null,

  init() {
    this.createDOM();
    this.bindEvents();
    
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
        <div class="music-top-bar">
          <button class="music-close-btn" id="music-close">${window.ICONS?.close || '✖'}</button>
        </div>
        
        <div class="music-content-wrapper">
          <div class="music-main-panel">
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
          
          <div class="music-sidebar">
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
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  bindEvents() {
    document.getElementById('music-close').addEventListener('click', () => this.close());
    document.getElementById('music-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('music-next').addEventListener('click', () => this.next());
    document.getElementById('music-prev').addEventListener('click', () => this.prev());
    document.getElementById('music-shuffle').addEventListener('click', () => this.toggleShuffle());
    document.getElementById('music-repeat').addEventListener('click', () => this.toggleRepeat());
    
    const progress = document.getElementById('music-progress');
    progress.addEventListener('input', (e) => {
      const time = (e.target.value / 100) * this.audio.duration;
      if (!isNaN(time)) this.audio.currentTime = time;
    });

    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.music-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`music-tab-${tab.dataset.target}`).classList.add('active');
      });
    });
  },

  play(library, index) {
    this.library = library;
    this.queue = [...library.files]; // Full library as queue for now
    if (this.shuffle) {
      this.currentIndex = index;
    } else {
      this.currentIndex = index;
    }
    
    this.loadTrack(this.currentIndex);
    document.getElementById('music-drawer').classList.add('open');
  },

  async loadTrack(index) {
    const file = this.queue[index];
    if (!file) return;

    // Set Audio Source
    this.audio.src = api.streamUrl(this.library.name, file.relativePath);
    this.audio.play().catch(e => console.warn('Autoplay prevented', e));

    // Reset UI
    document.getElementById('music-title').textContent = file.name.replace(/\.[^.]+$/, "");
    document.getElementById('music-artist').textContent = "Loading...";
    document.getElementById('music-tech').textContent = "Loading info...";
    document.getElementById('music-cover').style.backgroundImage = '';
    document.getElementById('music-backdrop').style.backgroundImage = '';
    document.getElementById('music-lyrics-text').textContent = "Fetching lyrics...";
    
    this.updateQueueUI();

    // Fetch Metadata
    try {
      const res = await api.authFetch(`/api/music/metadata/${encodeURIComponent(this.library.name)}/${encodeURIComponent(file.relativePath)}`);
      const meta = await res.json();
      
      document.getElementById('music-title').textContent = meta.title || file.name.replace(/\.[^.]+$/, "");
      document.getElementById('music-artist').textContent = meta.artist || "Unknown Artist";
      
      const kbs = Math.round(meta.bitrate / 1000);
      const khz = (meta.sampleRate / 1000).toFixed(1);
      document.getElementById('music-tech').textContent = `${meta.codec.toUpperCase()} · ${meta.bitDepth}-bit · ${khz}kHz · ${kbs > 0 ? kbs + 'kbps' : 'Unknown'}`;

      // Fetch cover art
      const coverUrl = `/api/music/cover/${encodeURIComponent(this.library.name)}/${encodeURIComponent(file.relativePath)}`;
      document.getElementById('music-cover').style.backgroundImage = `url("${coverUrl}")`;
      document.getElementById('music-backdrop').style.backgroundImage = `url("${coverUrl}")`;

      // Fetch Lyrics
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
    }
  },

  updatePlayState() {
    const playBtn = document.getElementById('music-play');
    if (this.audio.paused) {
      playBtn.innerHTML = window.ICONS?.play || 'Play';
    } else {
      playBtn.innerHTML = window.ICONS?.pause || 'Pause';
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
      return `
        <div class="queue-item ${isPlaying ? 'playing' : ''}" onclick="MusicPlayer.loadTrack(${i})">
          <div class="queue-item-cover"></div>
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
  },
  
  close() {
    document.getElementById('music-drawer').classList.remove('open');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Give views.js a moment to define ICONS
  setTimeout(() => {
    MusicPlayer.init();
  }, 100);
});
