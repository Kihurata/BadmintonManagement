---
id: ufm6vp
title: Material Symbols Import Order in Tailwind CSS
layer: project
category: convention
tags:
  - css
  - icons
  - tailwind
createdAt: '2026-06-29T14:37:20.701Z'
updatedAt: '2026-06-29T14:37:20.701Z'
---

In Tailwind CSS + PostCSS setups, @import statements must precede all other statements including @tailwind directives. Otherwise they are ignored, causing font icons to render as plain text. Alternatively, load the font stylesheet directly in layout.tsx via a link tag.
