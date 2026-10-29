import { useEffect, useRef } from 'react';

type BackHandler = () => boolean; // return true if handled, false otherwise

class MobileBackStackManager {
  private handlers: BackHandler[] = [];
  private lastBackPressTime = 0;
  private exitToastCallback: ((show: boolean) => void) | null = null;
  private exitToastTimeout: number | null = null;
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Push an initial base state so the first back press can be caught
    if (!window.history.state || !window.history.state.__vocalmaster_root) {
      window.history.replaceState({ __vocalmaster_root: true }, '');
    }

    window.addEventListener('popstate', this.handlePopState);
  }

  public registerExitToastCallback(cb: (show: boolean) => void) {
    this.exitToastCallback = cb;
  }

  public pushHandler(handler: BackHandler): () => void {
    this.init();
    this.handlers.push(handler);
    // Push a new history entry so mobile hardware back triggers popstate
    window.history.pushState({ __vocalmaster_modal: true, depth: this.handlers.length }, '');

    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) {
        this.handlers.splice(idx, 1);
      }
    };
  }

  private handlePopState = () => {
    // 1. If any modal / menu / sub-view handler is registered, execute the top one
    if (this.handlers.length > 0) {
      const topHandler = this.handlers[this.handlers.length - 1];
      const handled = topHandler();
      if (handled) {
        this.handlers.pop();
        return;
      }
    }

    // 2. We are at root view. Check for double-back-press to exit
    const now = Date.now();
    const timeSinceLastPress = now - this.lastBackPressTime;

    if (timeSinceLastPress < 2000) {
      // User pressed back twice within 2 seconds -> Allow native exit
      if (this.exitToastTimeout) {
        window.clearTimeout(this.exitToastTimeout);
      }
      if (this.exitToastCallback) {
        this.exitToastCallback(false);
      }
      // Actually navigate back to let Android close the tab/app
      window.history.back();
    } else {
      // First press: Show toast and re-push state to prevent instant exit
      this.lastBackPressTime = now;
      window.history.pushState({ __vocalmaster_root: true }, '');

      if (this.exitToastCallback) {
        this.exitToastCallback(true);
      }

      if (this.exitToastTimeout) {
        window.clearTimeout(this.exitToastTimeout);
      }
      this.exitToastTimeout = window.setTimeout(() => {
        if (this.exitToastCallback) {
          this.exitToastCallback(false);
        }
      }, 2000);
    }
  };
}

export const mobileBackManager = new MobileBackStackManager();

/**
 * React hook to register a back button handler for modals, dialogs, fullscreen views, or sub-tabs.
 * When enabled is true, pressing the mobile back button will call onClose() instead of closing the app.
 */
export function useMobileBackHandler(enabled: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;

    const unregister = mobileBackManager.pushHandler(() => {
      onCloseRef.current();
      return true; // handled
    });

    return unregister;
  }, [enabled]);
}
