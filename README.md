<div align="center">

# 🍜 Cup Noodles (カップヌードル)

### Your personal digital vault, served warm and effortless.

*A self-hosted entertainment sanctuary crafted to showcase and enjoy your movies, anime catalogs, audio collections, and high-resolution wallpaper archives.*
<br/>

## 🌌 What is Cup Noodles?

**Cup Noodles** is an elegant, self-hosted media server designed to bring your personal libraries to life. Instead of leaving your movies, anime, music, and wallpapers buried in cluttered system folders, Cup Noodles transforms them into a premium, immersive streaming platform.

By simply launching the app on your PC, you instantly spin up a powerful private backend that serves as the central hub for your digital universe. 

Best of all, **your collection travels with you around the house.** Once the vault is running, you can grab your phone, tablet, or laptop, type your PC's local IP address into any web browser, and immediately start streaming your media over your local network—complete with server-side transcoding for buttery-smooth playback on any device. 

---

## ✨ What's Inside the Bowl

- 🎬 **Instant Cinema & Anime** — Jump right into your favorite movies and episodes with zero loading friction or unnecessary setup complexity.
- 🎞️ **Automatic TMDB Metadata** — Movies and TV shows automatically pull gorgeous posters, cast details, synopses, and ratings from The Movie Database (TMDB). Missed a match? Use the built-in "Fix Match" dialog to manually link your files!
- 🖼️ **Immersive Art Galleries** — Glide through massive wallpaper and digital image archives with swift keyboard shortcuts and clean edge-to-edge viewing.
- 🎵 **Audiophile Music Experience** — A stunning, fully-featured music player designed with a premium modern aesthetic.
  - **Dynamic Squircle Grid:** Browse your library with massive, perfectly rounded album arts automatically extracted from your audio files.
  - **Premium Mini Player:** Minimize your music to a sleek, frosted-glass mini player that dynamically blurs the currently playing album art as its backdrop.
  - **Live Lyrics & Queue Management:** Fetch lyrics on the fly from the web, and manage your continuous playback queue effortlessly.
  - **Lossless FLAC Support:** Full support for high-fidelity `.flac` playback, alongside `.mp3`, `.wav`, and more, complete with technical bit-depth and codec readouts.
- ⚡ **Lightning-Fast Discovery** — Search, filter, and surface exactly what you're craving across thousands of items in real-time.
- 🌓 **Dynamic Day & Night Atmospheres** — Seamlessly shift between deep nighttime tranquility and bright daytime vibrancy to match your personal routine and surroundings.
- 📁 **Effortless Library Connect** — Point straight to your existing media folders in seconds without dealing with complex database setups or rigid library migrations.
- 📱 **Mobile Streaming with Server-Side Transcoding** — Your PC does all the heavy lifting. Stream 4K content to your phone at any quality without taxing the device.

---

## 📸 Interface Showcase

<div align="center">

  ### 🔒 Lockscreen
  <img src="https://wsrv.nl/?url=https://imgh.in/host/0lokv4&mask=corner&mrad=12" alt="Lockscreen Screenshot" width="90%">
  
  <br />

  ### 🏠 Homescreen
  <img src="https://imgh.in/host/e9fgxm" alt="Homescreen Screenshot" width="90%">
  
  <br />
  
  ### 🎬 Movies & TV Shows
  <img src="https://wsrv.nl/?url=https://imgh.in/host/4prh9j&mask=corner&mrad=12" alt="Movies Screenshot 1" width="90%">
  <br /><br />
  <img src="https://wsrv.nl/?url=https://imgh.in/host/krprw9&mask=corner&mrad=12" alt="Movies Screenshot 2" width="90%">
  
  <br />
  
  ### 🎵 Music Player
  <img src="https://wsrv.nl/?url=https://imgh.in/host/axprt3&mask=corner&mrad=12" alt="Music Screenshot 1" width="90%">
  <br /><br />
  <img src="https://wsrv.nl/?url=https://imgh.in/host/5zwfen&mask=corner&mrad=12" alt="Music Screenshot 2" width="90%">
  
  <br />
  
  ### 🖼️ Wallpapers & Galleries
  <img src="https://wsrv.nl/?url=https://imgh.in/host/hlxx5c&mask=corner&mrad=12" alt="Wallpapers Screenshot 1" width="90%">
  <br /><br />
  <img src="https://wsrv.nl/?url=https://imgh.in/host/np6m0s&mask=corner&mrad=12" alt="Wallpapers Screenshot 2" width="90%">

  <br />
  
  ### ⚙️ Settings
  <img src="https://wsrv.nl/?url=https://imgh.in/host/h2tv34&mask=corner&mrad=12" alt="Settings Screenshot" width="90%">

</div>

---

## 🚀 Ready to Serve?

Cup Noodles is designed to be as simple as possible. No complicated databases, no command line, no developer tools required.

### 1. Download the App
Head over to the [Releases](https://github.com/its-sorakun/cup-noodles/releases) page and download the latest `Cup-Noodles.Setup.exe ` file for Windows.

### 2. Install and Launch
Double-click the installer to install Cup Noodles on your PC. Once installed, the app will launch automatically.

*(Note: FFmpeg is already bundled inside the app for hardware-accelerated video transcoding to your mobile devices — zero setup required!)*

### 3. Dig In!
Upon launching, you will be met with the Vault Lockscreen. Simply log in with the default credentials and start adding your media folders!

---

## 🔒 Securing Your Vault

By default, Cup Noodles is completely locked down to ensure your personal media stays private. A default `auth.json` file will be automatically generated the very first time you start the app.

The default login credentials are:
- **Username:** `admin`
- **Password:** `admin`

**To change your credentials:**
Simply log in with the default credentials, open the **Settings** page from the top-right menu, and use the **Account & Security** section to securely update your username and password directly within the app!

---

## 📱 Watch Anywhere — Even on Your Phone

Cup Noodles uses **server-side transcoding** powered by FFmpeg to let you stream any video to any device — no matter how demanding the original file is. Your PC decodes and re-encodes the video in real time, then streams lightweight chunks straight to your phone or tablet over your home network.

When you open a video, simply pick your desired quality from the player controls:

| Quality | Resolution | Best For |
|:---:|:---:|---|
| `1080p` | 1920 × 1080 | Big screen, fast network |
| `720p` | 1280 × 720 | Phone streaming *(default)* |
| `480p` | 854 × 480 | Slower connections |
| `360p` | 640 × 360 | Very weak signal |
| `⚡ Direct` | Original | LAN desktop playback, no transcoding |
| `🔄 Remux` | Original | Direct stream copy, no quality loss packaging |

---

## 🍲 How to Savor

1. Open **Cup Noodles** in your browser and click over to **Settings**.
2. Paste in the folder paths where your favorite Movies, Anime, Wallpapers, or Audio albums live and hit **Save**.
3. Return to **Home**, pick your flavor, and enjoy the show!
<br />

---

## 🛠️ For Developers and tech enthusiasts

Cup Noodles consists of:

- Electron desktop application
- Express.js backend
- FFmpeg transcoding engine
- Browser-based frontend

Want to build Cup Noodles from source or run it as a headless web server?

```bash
git clone https://github.com/its-sorakun/cup-noodles.git
cd cup-noodles
npm install

# Run Desktop App in Dev Mode
npm run electron:dev

# Build Windows Installer
npm run electron:build

# Run Headless Web Server
npm run start
```

---

## ❤️ Acknowledgements

Movie and TV metadata provided by TMDB.

This product uses the TMDB API but is not endorsed or certified by TMDB.

---

<div align="center">

Made with ☕, 🍜 and countless late-night coding sessions.

If you enjoy Cup Noodles, consider leaving a ⭐ on the repository.

</div>
