# PDF Edit — "Vibrant Glass" Design Scheme (Redesign)

> **Design Philosophy**: "Effortless Magic".
> Moving away from the "quiet utility" of the previous design to a **dynamic, inspiring, and fluid** experience.
>
> **Key Visual Pillars**:
> 1.  **Aurora Gradients**: Subtle, moving mesh gradients in the background to create life and energy.
> 2.  **Glassmorphism**: Translucent surfaces (backdrop-blur) for the upload zone and cards to blend with the background.
> 3.  **Bold Typography**: Heavy headings with tight tracking for a modern tech feel.
> 4.  **Vibrant Accents**: Using a violet-to-blue gradient as the primary brand signature.

---

## 1. Color Palette

### Primary Gradient (Brand Signature)
Used for buttons, text gradients, and active states.
- **Start**: `#7C3AED` (Violet-600)
- **End**: `#2563EB` (Blue-600)
- **CSS Class**: `bg-gradient-to-r from-violet-600 to-blue-600`

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#7C3AED` | Fallback primary |
| `surface-glass` | `rgba(255, 255, 255, 0.7)` | Glass cards (light mode) |
| `surface-glass-hover` | `rgba(255, 255, 255, 0.85)` | Glass hover state |
| `text-primary` | `#1E293B` (Slate-800) | Main headings |
| `text-secondary` | `#475569` (Slate-600) | Body text |
| `text-tertiary` | `#94A3B8` (Slate-400) | Captions |
| `border-subtle` | `rgba(255, 255, 255, 0.5)` | Glass borders |

### Background Gradients (Aurora)
Three blobs moving slowly:
1.  `#C4B5FD` (Violet-300)
2.  `#93C5FD` (Blue-300)
3.  `#FCD34D` (Amber-300) - small accent for warmth

---

## 2. Typography

**Font**: `Inter` (keep existing), but adjust weights.

| Element | Size | Weight | Tracking | Notes |
|---------|------|--------|----------|-------|
| **Display H1** | `4rem` (64px) | 800 (ExtraBold) | `-0.03em` | Tight, massive, confident. |
| **H2** | `2.5rem` (40px) | 700 (Bold) | `-0.02em` | Section headers. |
| **H3** | `1.25rem` (20px) | 600 (SemiBold) | `-0.01em` | Card titles. |
| **Body Lead** | `1.25rem` (20px) | 400 (Regular) | `0` | Subtitles. |
| **Body** | `1rem` (16px) | 400 (Regular) | `0` | Standard text. |

---

## 3. UI Components Style

### Glass Card (The "Container")
Instead of solid white borders, we use light + blur.
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);
}
```

### Primary Button (Gradient Pill)
```css
.btn-primary {
  background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(124, 58, 237, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px 0 rgba(124, 58, 237, 0.4);
}
```

### Upload Zone (The "Portal")
A large, inviting glass surface.
- **Idle**: Glass panel, dashed border (violet-300), subtle floating icon.
- **Hover**: Scale up slightly, border turns to gradient, inner glow.
- **Drag**: "Magnetic" pull effect, icon bounces.

---

## 4. Layout Structure

### Hero Section (Above Fold)
- **Background**: Full-screen Aurora animation.
- **Content**:
    - **Badge**: "New: AI-Powered OCR" (Fake feature for hype) -> "Free & Private PDF Editor". Pill shape, glass background.
    - **Headline**: "PDFs, <span class="text-gradient">Reimagined</span>."
    - **Subtitle**: "The most beautiful way to edit documents in your browser. Zero uploads. Zero friction."
    - **Upload Widget**: Centered, large, floating glass card.

### Feature Grid (Bento Grid Style)
Instead of 3 columns, use a **Bento Grid** layout (asymmetrical grid) for features.
- Card 1 (Large): "Edit Text" (Show a mini UI mockup inside).
- Card 2 (Medium): "Privacy First" (Shield 3D icon).
- Card 3 (Medium): "Instant Export" (Lightning icon).

---

## 5. Animations

- **Aurora**: Infinite loop of gradient blobs moving/morphing.
- **Float**: Elements have a subtle vertical "breathing" animation.
- **Reveal**: Staggered fade-up for all elements on load.
- **Confetti**: When file is dropped successfully, trigger a mini confetti explosion (CSS particles) before transitioning.

---

## 6. Implementation Plan

1.  **CSS**: Define `aurora` keyframes and glass utility classes.
2.  **Hero**: Implement the "Bento" style or centralized layout with the new typography.
3.  **Upload**: Rebuild as a `GlassZone` component.
4.  **Transition**: Keep the smooth exit, but make the entrance of the editor fade in from a "zoom" effect (portal feeling).

