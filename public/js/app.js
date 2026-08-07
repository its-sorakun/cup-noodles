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

    if (route === "/login") {
      document.getElementById("main-nav").style.display = "none";
      await renderLogin();
      return;
    }
    
    // Check auth
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    // Sync to cookie for video playback if missing
    if (!document.cookie.includes("jwt_token=")) {
      document.cookie = `jwt_token=${token}; path=/; max-age=2592000`; // 30 days
    }
    
    document.getElementById("main-nav").style.display = "flex";

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

  document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("hashchange", handleRoute);
    ThemeManager.init();
    
    const $logoutBtn = document.getElementById("logout-btn");
    if ($logoutBtn) {
      $logoutBtn.addEventListener("click", () => api.logout());
    }

    const $fullscreenBtn = document.getElementById("fullscreen-toggle-btn");
    if ($fullscreenBtn) {
      $fullscreenBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      });
    }

    handleRoute();
  });
