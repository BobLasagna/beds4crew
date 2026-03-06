const STICKY_HEADER_SELECTOR = "header, [role='banner'], .MuiAppBar-root";

export const getNavbarOffset = (extraOffset = 0) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Math.max(extraOffset, 0);
  }

  const stickyElements = document.querySelectorAll(STICKY_HEADER_SELECTOR);
  let offset = 0;

  stickyElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.position === "fixed" || style.position === "sticky") {
      offset = Math.max(offset, el.getBoundingClientRect().height);
    }
  });

  return Math.max(offset + extraOffset, 0);
};

export const scrollElementIntoViewWithOffset = (
  element,
  { behavior = "smooth", extraOffset = 0 } = {}
) => {
  if (!element || typeof window === "undefined") return;

  const top =
    window.scrollY + element.getBoundingClientRect().top - getNavbarOffset(extraOffset);

  window.scrollTo({
    top: Math.max(top, 0),
    behavior,
  });
};
