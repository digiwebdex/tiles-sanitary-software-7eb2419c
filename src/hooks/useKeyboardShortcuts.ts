import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

/**
 * Register keyboard shortcuts. Keys use format: "F2", "F5", "F12", "Escape"
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        // Allow F-keys even in inputs
        if (!e.key.startsWith("F")) return;
      }

      const fn = shortcuts[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
