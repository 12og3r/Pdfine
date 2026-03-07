// Polyfill DOMMatrix for pdfjs-dist in jsdom
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPoly {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        this.m11 = this.a; this.m12 = this.b;
        this.m21 = this.c; this.m22 = this.d;
        this.m41 = this.e; this.m42 = this.f;
      }
    }
    inverse() { return new DOMMatrixPoly(); }
    multiply() { return new DOMMatrixPoly(); }
    translate() { return new DOMMatrixPoly(); }
    scale() { return new DOMMatrixPoly(); }
    rotate() { return new DOMMatrixPoly(); }
    transformPoint(p: { x: number; y: number }) { return p; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
    toString() { return 'matrix(1,0,0,1,0,0)'; }
    static fromMatrix() { return new DOMMatrixPoly(); }
    static fromFloat32Array() { return new DOMMatrixPoly(); }
    static fromFloat64Array() { return new DOMMatrixPoly(); }
  }
  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPoly;
  (globalThis as Record<string, unknown>).DOMMatrixReadOnly = DOMMatrixPoly;
}

// Polyfill Path2D for jsdom
if (typeof globalThis.Path2D === 'undefined') {
  class Path2DPoly {
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    rect() {}
    closePath() {}
    addPath() {}
  }
  (globalThis as Record<string, unknown>).Path2D = Path2DPoly;
}

// Polyfill ImageData for jsdom
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPoly {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  }
  (globalThis as Record<string, unknown>).ImageData = ImageDataPoly;
}

// Mock FontFace API for jsdom
class MockFontFace {
  family: string
  status: string
  constructor(family: string, _source: unknown, _descriptors?: unknown) {
    this.family = family
    this.status = 'loaded'
  }
  load(): Promise<MockFontFace> {
    return Promise.resolve(this)
  }
}

(globalThis as unknown as Record<string, unknown>).FontFace = MockFontFace

// Mock document.fonts
Object.defineProperty(document, 'fonts', {
  value: {
    add: () => {},
    delete: () => {},
    has: () => false,
  },
  writable: true,
})

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  getContext(): unknown {
    return {
      measureText: (text: string) => ({ width: text.length * 7 }),
      font: '',
      fillStyle: '',
      fillText: () => {},
      fillRect: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      setTransform: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      drawImage: () => {},
      translate: () => {},
      rotate: () => {},
      setLineDash: () => {},
      strokeRect: () => {},
      rect: () => {},
      arc: () => {},
      canvas: { width: 800, height: 600 },
    }
  }
}

(globalThis as unknown as Record<string, unknown>).OffscreenCanvas = MockOffscreenCanvas
