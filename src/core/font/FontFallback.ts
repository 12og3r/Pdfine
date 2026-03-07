import type { RegisteredFont } from '../../types/document'
// Level 3 substitutes: same type
const SERIF_FALLBACKS = ['Georgia', 'Times New Roman', 'serif'];
const SANS_FALLBACKS = ['Arial', 'Helvetica', 'sans-serif'];
const MONO_FALLBACKS = ['Courier New', 'monospace'];

// Level 4: generic
const GENERIC_FALLBACK = 'sans-serif';

export class FontFallback {
  private fontRegistry: Map<string, RegisteredFont>;

  constructor(fontRegistry: Map<string, RegisteredFont>) {
    this.fontRegistry = fontRegistry;
  }

  getFallbackFont(fontId: string, _char: string): string {
    const originalFont = this.fontRegistry.get(fontId);

    // Level 1: Original font exists and is usable
    if (originalFont?.fontFace) {
      return fontId;
    }

    // Level 2: Same family, complete version
    if (originalFont) {
      const sameFamily = this.findSameFamily(originalFont);
      if (sameFamily) {
        return sameFamily.id;
      }
    }

    // Level 3: Same type substitute
    const category = this.detectCategory(originalFont);
    const substitutes = this.getSubstitutes(category);

    for (const sub of substitutes) {
      // Check if this system font is registered
      for (const [id, font] of this.fontRegistry) {
        if (font.name === sub || font.family === sub) {
          return id;
        }
      }
      // Return the system font name directly as fallback
      return sub;
    }

    // Level 4: Generic
    return GENERIC_FALLBACK;
  }

  private findSameFamily(font: RegisteredFont): RegisteredFont | undefined {
    for (const [, candidate] of this.fontRegistry) {
      if (
        candidate.id !== font.id &&
        candidate.family === font.family &&
        candidate.editable &&
        candidate.fontFace
      ) {
        return candidate;
      }
    }
    return undefined;
  }

  private detectCategory(font: RegisteredFont | undefined): 'serif' | 'sans' | 'mono' {
    if (!font) return 'sans';

    const name = font.name.toLowerCase();
    const family = font.family.toLowerCase();

    if (name.includes('mono') || family.includes('mono') || name.includes('courier')) {
      return 'mono';
    }
    if (
      name.includes('times') ||
      name.includes('georgia') ||
      name.includes('garamond') ||
      name.includes('serif') && !name.includes('sans')
    ) {
      return 'serif';
    }
    return 'sans';
  }

  private getSubstitutes(category: 'serif' | 'sans' | 'mono'): string[] {
    switch (category) {
      case 'serif': return SERIF_FALLBACKS;
      case 'mono': return MONO_FALLBACKS;
      default: return SANS_FALLBACKS;
    }
  }
}
