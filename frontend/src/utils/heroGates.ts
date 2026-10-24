import { useEffect, useState } from "react";

/**
 * Screens that get the composed static intro instead of the scroll-driven one.
 * These strings must match the media queries in HomeView.css character for character.
 */
export const STATIC_HERO_GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)",
] as const;

const matchesAny = () =>
  typeof window !== "undefined" && STATIC_HERO_GATES.some((q) => window.matchMedia(q).matches);

/** True while any gate matches. Re-evaluates on rotation, resize and preference changes. */
export function useStaticHero(): boolean {
  const [isStatic, setIsStatic] = useState(matchesAny);
  useEffect(() => {
    const lists = STATIC_HERO_GATES.map((q) => window.matchMedia(q));
    const update = () => setIsStatic(lists.some((m) => m.matches));
    lists.forEach((m) => m.addEventListener("change", update));
    update();
    return () => lists.forEach((m) => m.removeEventListener("change", update));
  }, []);
  return isStatic;
}

/** True while the visitor asks for reduced motion. */
export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setReduced(m.matches);
    m.addEventListener("change", update);
    update();
    return () => m.removeEventListener("change", update);
  }, []);
  return reduced;
}
