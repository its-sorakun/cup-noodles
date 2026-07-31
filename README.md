<div align="center">

# 🍜 Cup Noodles (カップヌードル)

### Your personal digital vault, served warm and effortless.

*A self-hosted entertainment sanctuary crafted to showcase and enjoy your movies, anime catalogs, audio collections, and high-resolution wallpaper archives.*
<br/>

<div align="center">
  <img src="https://imgh.in/host/xwxppp" alt="Cup Noodles Lockscreen" width="90%" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
  <br /><br />
  <img src="https://imgh.in/host/vopdpu" alt="Cup Noodles Homepage" width="90%" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
</div>
</div>

## 🌌 Why Cup Noodles?

Your digital collection shouldn't stay buried inside cluttered system folders. **Cup Noodles** transforms your personal libraries into an immersive, private sanctuary built around instant access, seamless organization, and pure visual aesthetic. 

Whether you are curating vast anime seasons, admiring high-resolution digital artwork, or relaxing with an evening film, your entire universe of comfort media is always just one click away. Welcome home. *(Okaeri, Senpai!)*

---

## ✨ What's Inside the Bowl

- 🎬 **Instant Cinema & Anime** — Jump right into your favorite movies and episodes with zero loading friction or unnecessary setup complexity.
- 🖼️ **Immersive Art Galleries** — Glide through massive wallpaper and digital image archives with swift keyboard shortcuts and clean edge-to-edge viewing.
- 🎵 **Soundtrack Discovery** — Keep your favorite soundtracks, OSTs, and audio albums organized and ready to play in the background.
- ⚡ **Lightning-Fast Discovery** — Search, filter, and surface exactly what you're craving across thousands of items in real-time.
- 🌓 **Dynamic Day & Night Atmospheres** — Seamlessly shift between deep nighttime tranquility and bright daytime vibrancy to match your personal routine and surroundings.
- 📁 **Effortless Library Connect** — Point straight to your existing media folders in seconds without dealing with complex database setups or rigid library migrations.
- 📱 **Mobile Streaming with Server-Side Transcoding** — Your PC does all the heavy lifting. Stream 4K content to your phone at any quality without taxing the device.

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

---

## 🍲 How to Savor

1. Open **Cup Noodles** in your browser and click over to **Settings**.
2. Paste in the folder paths where your favorite Movies, Anime, Wallpapers, or Audio albums live and hit **Save**.
3. Return to **Home**, pick your flavor, and enjoy the show!
<br />

---

## 🛠️ For Developers

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

<div align="center">

*Crafted for late-night binging, curated aesthetics, and personal media enthusiasts.* 🥢<br>
**Enjoy your digital sanctuary.**

</div>
