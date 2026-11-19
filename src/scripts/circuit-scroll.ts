let users = 0;
let y = 0;
let height = 0;
const update = () => {
  y = window.scrollY;
  height = window.innerHeight;
};

export function watchCircuitScroll() {
  if (users++ === 0) {
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }
  return () => {
    if (--users !== 0) return;
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}

export const circuitScroll = {
  position: () => y,
  progress(top: number) {
    return Math.max(0, Math.min(1, (height * 0.9 + y - top) / (height * 0.7 || 1)));
  },
};
