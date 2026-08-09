---
name: Pulseforge
colors:
  surface: '#12121f'
  surface-dim: '#12121f'
  surface-bright: '#383846'
  surface-container-lowest: '#0d0d1a'
  surface-container-low: '#1a1a28'
  surface-container: '#1e1e2c'
  surface-container-high: '#292937'
  surface-container-highest: '#343342'
  on-surface: '#e3e0f3'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#e3e0f3'
  inverse-on-surface: '#2f2f3d'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#ffb0cc'
  on-secondary: '#640037'
  secondary-container: '#e10083'
  on-secondary-container: '#fffbff'
  tertiary: '#f2e9ff'
  on-tertiary: '#3c0091'
  tertiary-container: '#d9c8ff'
  on-tertiary-container: '#6834d1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#ffb0cc'
  on-secondary-fixed: '#3e0020'
  on-secondary-fixed-variant: '#8d0050'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#12121f'
  on-background: '#e3e0f3'
  surface-variant: '#343342'
typography:
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  body-fixed:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.5'
  body-main:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  ui-muted:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 64px
  gutter: 16px
  panel-padding: 20px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
---

## Brand & Style
The design system embodies a "Pro-Studio at Midnight" aesthetic, merging the precision of high-end digital audio workstations with the electric energy of a neon-lit nightclub. The interface is intentionally dense and technical, catering to professional creators who require high information density without sacrificing visual inspiration. 

The style is a hybrid of **Minimalism** and **Vaporwave-Technical**. It utilizes deep obsidian surfaces, crisp 1px borders, and concentrated "Hero Glows" to simulate hardware instrumentation. The emotional response is one of focused adrenaline—the UI should feel "alive" and reactive to audio input, using light as a functional indicator of signal and energy.

## Colors
The palette is built on a "Deep Space" foundation to maximize the luminosity of the neon accents. 

- **Backgrounds:** Use `#0A0A0F` for the primary canvas. Apply a subtle radial gradient of `#14101F` in large empty states or behind the main sequencer to provide depth.
- **Surfaces:** Panels and cards utilize `#131320`. All containers must be defined by a `#2A2A3A` 1px border to maintain structural clarity in low-light environments.
- **Accents:** Electric Cyan (`#00E5FF`) is reserved for active signal paths, waveforms, and primary system states. Hot Magenta (`#FF2E9A`) signifies generative AI features and creative "spark" actions. 
- **Accessibility:** Ensure all text labels maintain WCAG AA contrast against the dark background. Use the muted neutral (`#6E6E85`) only for non-critical metadata.

## Typography
The typographic hierarchy prioritizes technical utility and impact.

- **Headlines:** Use **Space Grotesk** for section titles and major headers. Tracking should be tight to emphasize the geometric, modernist nature of the font.
- **UI & Body:** **Inter** handles all standard interface text. Use the regular weight for readability; avoid bold weights for body text to keep the UI feeling light despite the dark theme.
- **Technical Data:** All numeric values, timecodes, BPM, and parameters must use **JetBrains Mono**. This ensures tabular alignment when values are rapidly changing (e.g., a rolling playhead timecode).

## Layout & Spacing
The layout follows a "Fixed-Sidebar, Fluid-Canvas" model. The primary navigation is a 64px vertical rail on the left, which can expand to show text labels.

- **Grid:** Use a 12-column grid for settings and dashboards, but a modular "dock" system for the music editor. 
- **Density:** This design system favors a "High Density" approach. Vertical stack spacing is typically 8px (sm) or 16px (md) to allow for maximum visibility of mixer channels and plugin parameters.
- **Breakpoints:** On tablet, the sidebar collapses to icons only. On mobile, the sequencer shifts to a vertical stack or a "Single-Track" view with a horizontal scroll.

## Elevation & Depth
Elevation is achieved through **Tonal Layering** and **Neon Glows** rather than traditional shadows.

- **Z-Axis:** Higher elevation levels are indicated by lighter border intensities or the presence of a background blur (Glassmorphism). 
- **Inner Glow:** Use a subtle 2px inner-shadow/glow on active panels using the Primary Accent color at 15% opacity to make them feel "powered on."
- **Backdrop Blur:** Modals and dropdown menus should use a 20px blur on a `#131320` surface with 80% opacity to maintain the "club" atmosphere while ensuring legibility.
- **Reactive Lighting:** When an audio signal is detected, the corresponding channel border should pulse with a soft cyan outer glow (4px blur, 0.4 opacity).

## Shapes
The shape language balances professional rigidity with modern approachability.

- **Panels/Cards:** Use a consistent `12px` radius for all main containers and workspace modules.
- **Interactive Elements:** Buttons use a `10px` radius, creating a softer "pill-lite" look that distinguishes them from structural containers.
- **Waveforms:** Render waveform peaks with a `2px` corner radius to avoid harsh aliasing, making the audio data feel fluid and organic.

## Components
- **Buttons:**
    - *Primary:* Gradient fill (Cyan to Magenta) with white Space Grotesk text. No border.
    - *Secondary:* Transparent background, 1px `#2A2A3A` border, Cyan text.
    - *AI/Generative:* Magenta 1px border with a faint 4% Magenta fill.
- **Input Fields:** Darker than the panel (`#0A0A0F`), 1px border. On focus, the border transitions to Cyan with a 2px outer glow.
- **Mixer Sliders:** The "track" is a dark line; the "thumb" is a Cyan vertical bar. Active track segments (the portion behind the thumb) should glow.
- **Chips:** Small, JetBrains Mono text, used for tags like "Vocal," "Synth," or "FX." Use the tertiary Violet for these tags.
- **Cards:** Must feature the 1px border. For "Active" tracks, include a decorative 2px vertical strip of the Cyan-to-Magenta gradient on the far left edge.
- **Sidebars:** Icons are 1.5px stroke weight. When active, the icon color changes to Cyan and gains a 4px soft glow.