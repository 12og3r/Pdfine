declare module 'opentype.js' {
  interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    tables: {
      os2?: {
        sTypoLineGap?: number;
        sxHeight?: number;
        sCapHeight?: number;
      };
    };
  }

  function parse(buffer: ArrayBuffer): Font;

  export default { parse };
}
