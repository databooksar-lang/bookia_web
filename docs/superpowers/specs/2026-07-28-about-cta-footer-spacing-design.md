# About CTA and Footer Spacing Design

## Goal

Create a small, intentional beige gap between the "Empezá por donde estés" call-to-action panel and the site footer on the About page.

## Chosen approach

Add a `margin-bottom` of `24px` to the existing `.about-cta` selector in `src/editorial.css`.

This uses the page background already visible around the rounded CTA panel, does not alter the footer itself, and preserves existing responsive layouts.

## Scope and verification

- Modify only `src/editorial.css`.
- Do not change copy, navigation, page structure, legal pages, privacy policy, cookie policy, or README: none are affected by a presentation-only spacing adjustment.
- Verify the production build and inspect the rendered About page at desktop and mobile widths.
