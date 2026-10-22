---
name: Look Optica
description: A warm, refined optical storefront that pairs clear value with reassuring expertise.
colors:
  honeyed-brass: "#f59e0b"
  opticians-amber: "#b45309"
  warm-cognac: "#92400e"
  amber-cream: "#fffbeb"
  amber-border: "#fde68a"
  clean-white: "#ffffff"
  mist-slate: "#f8fafc"
  slate-border: "#e2e8f0"
  slate-muted: "#64748b"
  lens-slate: "#334155"
  error-red: "#b91c1c"
  success-emerald: "#047857"
typography:
  display:
    fontFamily: "Zen Antique, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Zen Antique, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.025em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.opticians-amber}"
    textColor: "{colors.clean-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.warm-cognac}"
    textColor: "{colors.clean-white}"
  button-secondary:
    backgroundColor: "{colors.clean-white}"
    textColor: "{colors.warm-cognac}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.clean-white}"
    textColor: "{colors.lens-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  card-service:
    backgroundColor: "{colors.clean-white}"
    textColor: "{colors.lens-slate}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  chip-category:
    backgroundColor: "{colors.clean-white}"
    textColor: "{colors.honeyed-brass}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Look Optica

## Overview

**Creative North Star: "The Golden Lens"**

The Golden Lens presents optical retail through warmth, clarity, and measured polish. Amber communicates care and value, slate supplies professional restraint, and generous white or cream surfaces keep product photography and practical information easy to read. The result should feel refined, calm, and professional rather than clinical or luxurious for its own sake.

The interface is softly layered: fine borders establish most structure, while restrained shadows lift menus, interactive cards, and important actions. Rounded forms make commerce and service workflows reassuring without becoming playful. Zen Antique appears selectively as a warm editorial accent; the system sans serif carries navigation, product data, forms, checkout, and administrative work.

**Key Characteristics:**

- Warm amber hierarchy against quiet slate neutrals
- Product-led imagery with calm, readable supporting UI
- Rounded, reassuring controls and containers
- Fine borders first, soft elevation second
- Selective display typography paired with practical system text

## Colors

The palette moves from bright Honeyed Brass through Optician's Amber to deep Warm Cognac, grounded by cool slate neutrals and clean retail surfaces.

### Primary

- **Optician's Amber:** The default brand and action color for primary buttons, prices, navigation emphasis, and high-value links.
- **Warm Cognac:** The deeper anchor for headings, strong hover states, and moments requiring greater visual authority.
- **Honeyed Brass:** The brighter note for small metadata, highlights, progress, and selective accents rather than large text fields.

### Neutral

- **Clean White:** The principal card, menu, input, header, and footer surface.
- **Mist Slate:** The page canvas and quiet alternate surface.
- **Slate Border:** The neutral divider and low-emphasis control border.
- **Slate Muted:** Secondary copy, icons, placeholders, and subdued labels.
- **Lens Slate:** Primary body text when black would feel too severe.

### Tertiary

- **Error Red:** Reserved for destructive actions, errors, discounts that require warning emphasis, and the active wishlist heart.
- **Success Emerald:** Reserved for successful states, availability, and positive administrative actions.

### Named Rules

**The Amber Hierarchy Rule.** Bright, core, and deep amber tones must communicate increasing emphasis; do not use them interchangeably as decoration.

**The Quiet Canvas Rule.** Product imagery and transactional content sit on white, cream, or mist-slate surfaces so the merchandise remains the visual lead.

## Typography

**Display Font:** Zen Antique (with Georgia and serif fallbacks)

**Body Font:** System sans serif (`ui-sans-serif`, `system-ui`, sans-serif)

**Character:** Zen Antique gives selected service and campaign headings a cultivated optical-retail voice. The system sans serif remains compact, familiar, and highly legible for shopping, checkout, account, and administration interfaces.

### Hierarchy

- **Display** (semibold, 3rem, 1.25): Large desktop hero statements; reduce responsively to approximately 1.875rem on small screens.
- **Headline** (regular, 1.875rem, 1.25): Editorial service headings, newsletter calls, and distinctive section introductions.
- **Title** (semibold, 1.25rem, 1.4): Product prices, card headings, page subsections, and prominent form titles.
- **Body** (regular, 0.875rem, 1.625): Product information, service explanations, form help, and general interface copy.
- **Label** (semibold, 0.75rem, 0.025em): Metadata, category chips, compact controls, and uppercase brand labels.

### Named Rules

**The Selective Serif Rule.** Zen Antique is an accent for meaningful customer-facing moments, not the default for dense forms, navigation, prices, or administration.

**The Readable Commerce Rule.** Functional text remains in the system sans serif, with semibold weight used to signal action or hierarchy rather than ornamental styling.

## Layout

The customer experience uses a fluid full-width shell with page content typically constrained between 56rem and 72rem. Horizontal padding begins at 16–24px, while major vertical sections commonly use 32–40px of separation. Product collections use two columns on small screens and four columns from the medium breakpoint; service and category content shifts from stacked or two-column mobile arrangements to balanced desktop grids.

The responsive system follows the implemented Tailwind breakpoints: small at 640px, medium at 768px, and large at 1024px. The primary navigation becomes a compact menu below the medium breakpoint, while search, account, cart, and social actions remain directly available. Spacing follows a practical 4px base rhythm, most often expressed as 8px, 12px, 16px, 24px, 32px, and 40px intervals.

**The Product Breathing Room Rule.** Dense data can remain compact, but product imagery, major services, and checkout decisions must keep clear separation and stable alignment.

## Elevation & Depth

The system is softly layered. Borders and tonal surface shifts define the default hierarchy; shadows are used to lift interactive controls, cards, dropdown menus, overlays, and high-priority actions. Image overlays use restrained black gradients so white copy remains legible without obscuring merchandise.

### Shadow Vocabulary

- **Quiet Lift** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Inputs, service cards, and low-emphasis controls.
- **Interactive Lift** (`0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)`): Hovered service cards and medium-priority floating content.
- **Menu Lift** (`0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)`): Dropdowns, prominent actions, and overlay labels.

### Named Rules

**The Border-Before-Shadow Rule.** Establish structure with a fine border or tonal shift first; add a shadow only when an element needs to sit above its surroundings.

## Shapes

Gently rounded geometry is the default. Compact controls and dense administrative elements use 6–8px corners, customer-facing fields and buttons commonly use 8–12px, cards use 12–16px, and hero or campaign surfaces may reach 24px. Pills are reserved for category chips, search fields, badges, and intentionally compact calls to action.

Borders remain thin and warm around branded customer components, with neutral slate borders used in dense tools and tables. Product imagery is clipped cleanly within rounded containers and generally avoids decorative frames.

**The Reassuring Curve Rule.** Corners should feel soft and deliberate; do not mix square and highly rounded elements within the same component family without a functional reason.

## Components

### Buttons

- **Shape:** Compact, gently rounded controls (8–12px), with pills used only for hero or compact promotional actions.
- **Primary:** Optician's Amber with white semibold text and practical 8px × 16px padding; larger conversion actions may use 12px vertical padding.
- **Hover / Focus:** Deepen toward Warm Cognac or brighten one amber step. Focus must remain clearly visible; the incumbent system usually shifts the border and removes the browser outline, so new work should preserve an equally strong visible focus treatment.
- **Secondary:** White or transparent surfaces with amber text and a pale amber border; hover introduces Amber Cream.
- **Destructive / Status:** Red and emerald variants are semantic exceptions and must not compete with the amber brand action.

### Chips

- **Style:** Small uppercase or compact labels with a full pill radius, fine border, and restrained padding.
- **State:** Unselected chips remain white or transparent; selected filters use amber border, text, or a pale amber fill rather than heavy elevation.

### Cards / Containers

- **Corner Style:** Product image containers use 12px; service and information cards use 16px.
- **Background:** Clean White or translucent white over a Mist Slate canvas; Amber Cream is used for messages and promotional sections.
- **Shadow Strategy:** Flat or Quiet Lift at rest, with Interactive Lift on hover when the whole card is actionable.
- **Border:** Pale amber for branded customer cards and neutral slate for utility or administrative content.
- **Internal Padding:** Typically 16px for compact information and 24px for service or form containers.

### Inputs / Fields

- **Style:** White surface, thin amber or slate border, 8–12px corners, and 12px × 16px padding for customer-facing forms.
- **Focus:** Border shifts to a stronger amber. A visible focus indication must remain available for keyboard users.
- **Error / Disabled:** Errors use red copy with pale red surfaces or borders; disabled controls reduce opacity while retaining legible labels.

### Navigation

Navigation sits on a translucent white sticky surface with a fine lower border and subtle backdrop blur. Desktop links use compact amber text and deepen or brighten on hover. Mobile navigation uses a bordered rounded trigger and a softly elevated white menu. Account, search, cart, and social controls remain icon-led and visually secondary to shopping navigation.

### Product Card

The signature product card lets photography lead. The image sits on a quiet neutral surface with a gentle 12px crop, subtle zoom on hover, and a floating circular wishlist control. Brand and category metadata remain small; the product name is concise; Optician's Amber gives the price immediate clarity.

## Do's and Don'ts

### Do:

- **Do** use Optician's Amber for the primary commercial action and price emphasis.
- **Do** keep most surfaces white, Amber Cream, or Mist Slate so products and service information remain clear.
- **Do** use thin borders and tonal shifts before adding elevation.
- **Do** reserve Zen Antique for selective customer-facing headlines and service moments.
- **Do** preserve visible keyboard focus, readable contrast, and scalable text across customer journeys.

### Don't:

- **Don't** turn the amber family into undifferentiated decoration; every shade must carry a clear hierarchy role.
- **Don't** use heavy shadows on every card or control; elevation is a response to hierarchy and interaction.
- **Don't** apply the display serif to dense product data, forms, checkout, or administrative interfaces.
- **Don't** let decorative overlays overpower product photography or reduce text contrast.
- **Don't** introduce sharp, clinical geometry into an otherwise rounded and reassuring component family.
