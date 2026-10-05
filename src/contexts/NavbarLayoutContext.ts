import { createContext, useContext } from "react";

// Screens opt in; the navbar owns keyboard timing and its animation.
export const NavbarLayoutContext = createContext<(compact: boolean) => void>(() => {});

export function useNavbarCompactLayoutSetter() {
  return useContext(NavbarLayoutContext);
}

// Mutable transition status avoids broadcasting every animation frame to React.
export function createNavbarLayoutTransition() {
  let running = false;
  const listeners = new Set<() => void>();
  return {
    isRunning: () => running,
    start: () => { running = true; },
    finish: () => {
      running = false;
      [...listeners].forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const NavbarLayoutTransitionContext = createContext(createNavbarLayoutTransition());

export function useNavbarLayoutTransition() {
  return useContext(NavbarLayoutTransitionContext);
}
