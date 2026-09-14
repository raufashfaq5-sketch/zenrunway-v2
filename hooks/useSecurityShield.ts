"use client";

import { useEffect, useState } from "react";

export interface SecurityShieldOptions {
  enableContextMenuDisable?: boolean;
  enableHotkeyBlocking?: boolean;
  enableDevToolsTrap?: boolean;
  onSecurityEvent?: (reason: string) => void;
}

export function useSecurityShield(options: SecurityShieldOptions = {}) {
  const {
    enableContextMenuDisable = true,
    enableHotkeyBlocking = true,
    enableDevToolsTrap = true,
    onSecurityEvent,
  } = options;

  const [devToolsDetected, setDevToolsDetected] = useState<boolean>(false);

  useEffect(() => {
    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      if (enableContextMenuDisable) {
        e.preventDefault();
        onSecurityEvent?.("Right-click context menu disabled by ZenRunway Security Shield.");
      }
    };

    // 2. Intercept and Block Inspection Hotkeys (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Opt+I/J/U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableHotkeyBlocking) return;

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key.toUpperCase();

      // F12
      if (key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        onSecurityEvent?.("Developer inspect hotkey (F12) blocked.");
        return false;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (isCmdOrCtrl && isShift && (key === "I" || key === "J" || key === "C")) {
        e.preventDefault();
        e.stopPropagation();
        onSecurityEvent?.(`Developer console hotkey (${e.ctrlKey ? "Ctrl" : "Cmd"}+Shift+${key}) blocked.`);
        return false;
      }

      // Ctrl+U (View Source)
      if (isCmdOrCtrl && key === "U") {
        e.preventDefault();
        e.stopPropagation();
        onSecurityEvent?.(`View source hotkey (${e.ctrlKey ? "Ctrl" : "Cmd"}+U) blocked.`);
        return false;
      }

      // Cmd+Alt+I, Cmd+Alt+J, Cmd+Alt+U (Mac OS)
      if (isCmdOrCtrl && isAlt && (key === "I" || key === "J" || key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        onSecurityEvent?.(`Developer hotkey (${e.metaKey ? "Cmd" : "Ctrl"}+Alt+${key}) blocked.`);
        return false;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    // 3. Subtle DevTools Detection Listener (Dimension & Timing Check)
    let devToolsInterval: NodeJS.Timeout | null = null;
    if (enableDevToolsTrap) {
      devToolsInterval = setInterval(() => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
          setDevToolsDetected(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      if (devToolsInterval) clearInterval(devToolsInterval);
    };
  }, [enableContextMenuDisable, enableHotkeyBlocking, enableDevToolsTrap, onSecurityEvent]);

  return { devToolsDetected };
}
