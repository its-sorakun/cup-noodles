<div align="center">

# 🍜 Cup Noodles

### Your personal digital vault, served warm and effortless.

*A self-hosted entertainment sanctuary crafted to showcase and enjoy your movies, anime catalogs, audio collections, and high-resolution wallpaper archives.*

<br />
<p align="center">
  <img src="https://imgh.in/host/plz44n" alt="Cup Noodles Homepage">
</p>
</div>

## 🌌 Why Cup Noodles?

Your digital collection shouldn't stay buried inside cluttered system folders. **Cup Noodles** transforms your personal libraries into an immersive, private sanctuary built around instant access, seamless organization, and pure visual pleasure. Whether you are curating vast anime seasons, admiring high-resolution digital artwork, or relaxing with an evening film, your entire universe of comfort media is always just one click away.

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

Get your personal streaming sanctuary hot and ready in less than two minutes:

### 1. Grab the Bowl
```bash
git clone https://github.com/its-sorakun/cup-noodles.git
cd cup-noodles
```

### 2. Prepare the Ingredients
```bash
npm install
```

### 2.5. Add FFmpeg *(optional — for mobile transcoding)*

FFmpeg is required to stream videos to your phone at lower quality. Skip this step if you only plan to watch on the same device running the server.

**Windows** — download from [ffmpeg.org/download](https://ffmpeg.org/download.html), extract, and add the `bin` folder to your system PATH. Alternatively you can use chocolatey package manager to install FFmpeg by running the following command in your terminal:
```bash
choco install ffmpeg
```

**macOS**
```bash
brew install ffmpeg
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt install ffmpeg
```

Verify it works:
```bash
ffmpeg -version
```

> ⚠️ Make sure to **open a fresh terminal** after adding FFmpeg to your PATH, then restart the server — otherwise Node.js won't detect it.

### 3. Let it Cook
```bash
node server.js
```

Once boiling, open your favorite web browser and dig in at **`http://localhost:1337`**!

---

## 🔒 Securing Your Vault

By default, Cup Noodles is completely locked down to ensure your personal media stays private. A default `auth.json` file will be automatically generated the very first time you start the server.

The default login credentials are:
- **Username:** `admin`
- **Password:** `admin`

**To change your credentials:**
1. Open the newly generated `auth.json` file in your Cup Noodles folder.
2. Change the `"username"` and `"password"` values to your preferred secure credentials.
3. Restart the server (press `Ctrl+C` in your terminal, then run `node server.js` again) for the changes to take effect.

---

## 📱 Watch Anywhere — Even on Your Phone

Cup Noodles uses **server-side transcoding** powered by FFmpeg to let you stream any video to any device — no matter how demanding the original file is. Your PC decodes and re-encodes the video in real time, then streams lightweight chunks straight to your phone or tablet over your home network.

When you open a video, simply pick your desired quality from the player controls:

| Quality | Resolution | Best For |
|---------|-----------|----------|
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

<div align="center">

*Crafted for late-night binging, curated aesthetics, and personal media enthusiasts.* 🥢

</div>
