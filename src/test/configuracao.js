import '@testing-library/jest-dom/vitest';

// O Recharts mede o contêiner pelo ResizeObserver, ausente no ambiente JSDOM.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }),
});
