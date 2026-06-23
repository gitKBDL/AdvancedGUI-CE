/**
 * Global test setup. Runs once per test file (configured via vitest `setupFiles`).
 *
 * happy-dom ships only a no-op <canvas> implementation, but several source
 * modules (Text, ParsedText, Canvas rendering helpers) ask an
 * HTMLCanvasElement for a 2D context and then call `measureText`, path ops,
 * etc. We install a deterministic fake 2D context so those modules import and
 * run without throwing. Width is modelled as 6px per character, which keeps
 * geometry assertions predictable. Tests that need precise metrics inject their
 * own context via `makeFakeContext()` from tests/helpers.ts instead.
 */
import { vi } from "vitest";

// happy-dom's localStorage is not reliably functional under Node 25, yet several
// modules (e.g. i18n.ts) call `localStorage.getItem` at import time. Install a
// deterministic Map-backed Storage shim before any source module is imported.
function installStorageShim(name: "localStorage" | "sessionStorage") {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  };
   
  Object.defineProperty(globalThis, name, { value: shim, configurable: true, writable: true });
  if (typeof window !== "undefined") {
     
    Object.defineProperty(window, name, { value: shim, configurable: true, writable: true });
  }
}
installStorageShim("localStorage");
installStorageShim("sessionStorage");

export function createFakeContext(): CanvasRenderingContext2D {
  const ctx = {
    canvas: { width: 0, height: 0 },
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    globalAlpha: 1,
    measureText: (text: string) => ({
      width: text.length * 6,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 6,
      actualBoundingBoxAscent: text.length > 0 ? 7 : 0,
      actualBoundingBoxDescent: text.length > 0 ? 1 : 0,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
    }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(() => null),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// Route every <canvas>.getContext("2d") to our deterministic fake.
const sharedContext = createFakeContext();
 
if ((globalThis as any).HTMLCanvasElement) {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    (type: string) => (type === "2d" ? sharedContext : null),
  ) as any;
}
