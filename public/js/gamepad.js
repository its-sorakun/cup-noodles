window.GamepadManager = (function() {
  let isPolling = false;
  let gamepadsConnected = {};
  
  // Throttle tracking for directions
  let lastActionTime = 0;
  const ACTION_THROTTLE = 180; // ms between dpad/analog ticks
  
  // State tracking for buttons to prevent rapid-fire on hold
  let buttonStates = {
    confirm: false,
    back: false
  };
  
  let isGamepadModeActive = false;
  let currentFocusEl = null;

  function init() {
    window.addEventListener("gamepadconnected", (e) => {
      gamepadsConnected[e.gamepad.index] = true;
      showNotification(`🎮 Controller Detected: ${e.gamepad.id}`);
      
      if (!isPolling) {
        isPolling = true;
        requestAnimationFrame(pollGamepads);
      }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      delete gamepadsConnected[e.gamepad.index];
      
      if (Object.keys(gamepadsConnected).length === 0) {
        showNotification(`🎮 Controller Disconnected`);
        isPolling = false;
        setGamepadMode(false);
      }
    });
    
    // Automatically switch back to mouse mode on mouse move
    window.addEventListener("mousemove", (e) => {
      // Ignore micro-jitters
      if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) {
        setGamepadMode(false);
      }
    });

    // Handle Spatial Navigation Events
    window.addEventListener('gamepad:up', () => navigateSpatial('up'));
    window.addEventListener('gamepad:down', () => navigateSpatial('down'));
    window.addEventListener('gamepad:left', () => navigateSpatial('left'));
    window.addEventListener('gamepad:right', () => navigateSpatial('right'));
    window.addEventListener('gamepad:confirm', () => {
      if (currentFocusEl) {
        if (currentFocusEl.tagName === 'INPUT') {
          currentFocusEl.focus();
        } else {
          currentFocusEl.click();
        }
      }
    });

    window.addEventListener('gamepad:back', () => {
      // Priority 1: Close media details overlay if open
      const detailsView = document.getElementById('media-details-view');
      if (detailsView) {
        detailsView.remove();
        return;
      }
      
      // Priority 2: Click the global back button if present (e.g. from Library to Home)
      const backBtn = document.getElementById('back-btn');
      if (backBtn) {
        backBtn.click();
      }
    });
  }

  function getFocusableElements() {
    // Select all interactive elements that are currently visible
    const selectors = 'a[href], button, input, [data-library], .nav-link, .gamepad-focusable';
    return Array.from(document.querySelectorAll(selectors)).filter(el => {
      const rect = el.getBoundingClientRect();
      // Ensure the element is visible on screen
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && !el.disabled;
    });
  }

  function navigateSpatial(direction) {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    // If nothing is focused, focus the first element (or the one closest to top-left)
    if (!currentFocusEl || !elements.includes(currentFocusEl)) {
      setFocus(elements[0]);
      return;
    }

    const currentRect = currentFocusEl.getBoundingClientRect();
    let bestMatch = null;
    let minDistance = Infinity;

    elements.forEach(el => {
      if (el === currentFocusEl) return;
      
      const rect = el.getBoundingClientRect();
      let dx = 0, dy = 0, isMatch = false;

      // Calculate directional logic (spatial)
      if (direction === 'up' && rect.bottom <= currentRect.top + 10) {
        dx = (rect.left + rect.width / 2) - (currentRect.left + currentRect.width / 2);
        dy = currentRect.top - rect.bottom;
        isMatch = true;
      } else if (direction === 'down' && rect.top >= currentRect.bottom - 10) {
        dx = (rect.left + rect.width / 2) - (currentRect.left + currentRect.width / 2);
        dy = rect.top - currentRect.bottom;
        isMatch = true;
      } else if (direction === 'left' && rect.right <= currentRect.left + 10) {
        dx = currentRect.left - rect.right;
        dy = (rect.top + rect.height / 2) - (currentRect.top + currentRect.height / 2);
        isMatch = true;
      } else if (direction === 'right' && rect.left >= currentRect.right - 10) {
        dx = rect.left - currentRect.right;
        dy = (rect.top + rect.height / 2) - (currentRect.top + currentRect.height / 2);
        isMatch = true;
      }

      if (isMatch) {
        // Distance formula, heavily weighting the primary axis
        const distance = Math.sqrt((dx * dx) + (dy * dy) * (direction === 'up' || direction === 'down' ? 1 : 4));
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = el;
        }
      }
    });

    if (bestMatch) {
      setFocus(bestMatch);
    }
  }

  function setFocus(el) {
    if (currentFocusEl) {
      currentFocusEl.classList.remove('gamepad-focus');
    }
    currentFocusEl = el;
    el.classList.add('gamepad-focus');
    
    // Scroll element into view smoothly if off-screen
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function setGamepadMode(active) {
    if (isGamepadModeActive !== active) {
      isGamepadModeActive = active;
      if (active) {
        document.body.classList.add("gamepad-mode");
        // Re-focus current element when switching back to gamepad
        if (currentFocusEl && document.contains(currentFocusEl)) {
          currentFocusEl.classList.add('gamepad-focus');
        } else {
          // If no focus, trigger a down to auto-focus first item
          navigateSpatial('down');
        }
      } else {
        document.body.classList.remove("gamepad-mode");
        // Clear focus if we switch back to mouse
        if (currentFocusEl) currentFocusEl.classList.remove('gamepad-focus');
      }
    }
  }

  function showNotification(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.className = "gamepad-popup slide-up fade-in";
    el.style.position = "fixed";
    el.style.bottom = "30px";
    el.style.right = "30px";
    el.style.padding = "14px 24px";
    el.style.backgroundColor = "rgba(10, 15, 30, 0.9)";
    el.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    el.style.color = "#fff";
    el.style.borderRadius = "12px";
    el.style.zIndex = "99999";
    el.style.fontWeight = "bold";
    el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.6)";
    el.style.backdropFilter = "blur(10px)";
    el.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
    
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      setTimeout(() => el.remove(), 400);
    }, 4000);
  }

  function dispatchDirection(action) {
    const now = Date.now();
    if (now - lastActionTime < ACTION_THROTTLE) return;
    
    setGamepadMode(true);
    lastActionTime = now;
    window.dispatchEvent(new CustomEvent('gamepad:' + action));
  }

  function dispatchButton(action, isPressed) {
    if (isPressed && !buttonStates[action]) {
      // Just pressed down
      buttonStates[action] = true;
      setGamepadMode(true);
      window.dispatchEvent(new CustomEvent('gamepad:' + action));
    } else if (!isPressed && buttonStates[action]) {
      // Just released
      buttonStates[action] = false;
    }
  }

  function pollGamepads() {
    if (!isPolling) return;
    
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;
      
      // Directions (D-Pad or Left Stick)
      if (gp.buttons[12]?.pressed || gp.axes[1] < -0.5) dispatchDirection('up');
      else if (gp.buttons[13]?.pressed || gp.axes[1] > 0.5) dispatchDirection('down');
      else if (gp.buttons[14]?.pressed || gp.axes[0] < -0.5) dispatchDirection('left');
      else if (gp.buttons[15]?.pressed || gp.axes[0] > 0.5) dispatchDirection('right');
      
      // Face Buttons
      dispatchButton('confirm', gp.buttons[0]?.pressed); // A / Cross
      dispatchButton('back', gp.buttons[1]?.pressed);    // B / Circle
      dispatchButton('x', gp.buttons[2]?.pressed);       // X / Square
      dispatchButton('y', gp.buttons[3]?.pressed);       // Y / Triangle
      
      // Bumpers & Triggers
      dispatchButton('l1', gp.buttons[4]?.pressed);      // LB / L1
      dispatchButton('r1', gp.buttons[5]?.pressed);      // RB / R1
      dispatchButton('l2', gp.buttons[6]?.pressed);      // LT / L2
      dispatchButton('r2', gp.buttons[7]?.pressed);      // RT / R2
      
      // System Buttons
      dispatchButton('select', gp.buttons[8]?.pressed);  // View / Share
      dispatchButton('start', gp.buttons[9]?.pressed);   // Menu / Options
    }
    
    requestAnimationFrame(pollGamepads);
  }
  
  window.addEventListener('DOMContentLoaded', init);
  
  return {
    isActive: () => isGamepadModeActive,
    setMode: setGamepadMode
  };
})();
