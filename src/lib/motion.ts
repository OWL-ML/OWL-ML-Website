// Animated in-page changes (Martin, November 2026): a same-document view transition in which
// the given elements carry a name of their own, so the browser moves each one to its new place,
// fades out the ones that disappear and fades in the new ones. The names are set only for the
// duration of the change (they would otherwise take part in page transitions too). Without
// browser support or under reduced motion, the change simply happens.

/**
 * A panel that has just replaced another (course, theme or profile tab) fades in while rising a
 * little, like a page change; the old one is gone at once, so nothing below it ghosts. Not under
 * reduced motion.
 */
export function revealPanel(el: Element | null | undefined) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}

/** A view-transition-name from an id: letters, digits, "-" and "_" only. */
export const transitionName = (prefix: string, id: string) =>
  `${prefix}-${id.replace(/[^A-Za-z0-9_-]/g, '-')}`;

const motionAllowed = () =>
  typeof document.startViewTransition === 'function' &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs `update` as an animated change. `named` lists the elements to move individually, each with
 * its name (unique on the page); elements hidden before or after are faded instead.
 */
export function animateChange(update: () => void, named: () => [HTMLElement, string][]) {
  if (!motionAllowed()) {
    update();
    return;
  }
  const set = (on: boolean) => {
    for (const [el, name] of named()) el.style.viewTransitionName = on ? name : '';
  };
  set(true);
  const transition = document.startViewTransition(() => {
    update();
    set(true); // elements that only now appear get their name too
  });
  transition.finished.finally(() => set(false));
}
