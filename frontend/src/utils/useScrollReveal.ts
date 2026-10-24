import { useLayoutEffect } from "react";

const SETTLE_MS = 1600;

/**
 * Scroll-in entrances for the current view. Only content that starts below the fold
 * is armed, so nothing already on screen blinks. Once revealed, the classes are
 * removed again, leaving no transform or stagger delay behind (boards inside
 * cards must never keep a transformed ancestor).
 *
 * - `.reveal-group` sections choreograph their own children (see HomeView.css).
 * - Plain `.card`s on non-arena pages rise in on their own.
 */
export function useScrollReveal(viewKey: string): void {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector(".main-content");
    if (!root) return;

    const fold = window.innerHeight * 0.92;
    const belowFold = (el: Element) => el.getBoundingClientRect().top > fold;
    const groups = [...root.querySelectorAll<HTMLElement>(".reveal-group")].filter(belowFold);
    const cards = [
      ...root.querySelectorAll<HTMLElement>(".view:not(.arena-page):not(.home) .card"),
    ].filter((el) => belowFold(el) && !el.closest(".reveal-group"));

    groups.forEach((el) => el.classList.add("reveal-armed"));
    cards.forEach((el) => el.classList.add("rv"));

    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          const isGroup = el.classList.contains("reveal-armed");
          el.classList.add(isGroup ? "in" : "rv-in");
          timers.push(
            window.setTimeout(() => {
              el.classList.remove("reveal-armed", "in", "rv", "rv-in");
            }, SETTLE_MS),
          );
        });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    [...groups, ...cards].forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      [...groups, ...cards].forEach((el) => el.classList.remove("reveal-armed", "in", "rv", "rv-in"));
    };
  }, [viewKey]);
}
