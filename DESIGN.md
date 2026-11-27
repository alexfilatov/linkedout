---
name: LinkedOut
description: A quiet browser utility for hiding LinkedIn Premium upsells.
colors:
  base-100: "#fffdf7"
  base-200: "#f3f1e9"
  base-300: "#d5d9d0"
  base-content: "#203d35"
  neutral: "#204f45"
  error: "#a32b32"
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333333
    letterSpacing: "-0.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.5
  supporting:
    fontSize: "0.875rem"
    lineHeight: 1.625
  opening:
    fontSize: "1.125rem"
    lineHeight: 1.375
  button:
    fontSize: "0.875rem"
    fontWeight: 600
  footer:
    fontSize: "0.75rem"
    lineHeight: 1.333333
rounded:
  field: "0.5rem"
  selector: "0.5rem"
spacing:
  unit: "0.25rem"
  small: "0.5rem"
  medium: "0.75rem"
  control: "1rem"
  section: "1.25rem"
  outer: "1.5rem"
components:
  button-default:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.base-content}"
    typography: "{typography.button}"
    rounded: "{rounded.field}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.base-content}"
    typography: "{typography.button}"
    rounded: "{rounded.field}"
    height: "2.5rem"
    padding: "0 1rem"
---

# Design System: LinkedOut

## Overview

A quiet cream-and-green browser utility with sparse text, standard controls, and a dry sarcastic opening. Platform-native system typography keeps the settings surface familiar.

Extracted from `PRODUCT.md`, `extension/popup.html`, `assets/popup.css`, and the generated `extension/popup.css`. Source extraction only; rendered appearance has not been validated. No additional visual identity or creative metaphor has been confirmed.

## Colors

Green text sits on warm cream. The darker neutral green is used for keyboard focus and text selection. Muted cream fills the default button; gray-green dividers separate settings. A dark red error color marks the alert. Other unused daisyUI theme colors are not design commitments.

## Typography

The title is compact and semibold. The two-line opening is slightly larger than body text. Supporting explanations use relaxed line spacing; status text uses the smaller size with its default line height. The footer is the smallest text. System fonts are intentional for this browser utility.

## Layout

A single column in a popup (360px wide, capped at the available width), with outer padding (24px). The header pairs a small icon (40px) with the title. The switch shares a row with its label; explanations and status messages follow below. Both actions span the column. Sections use spacing from the existing quarter-rem rhythm. No popup-specific responsive breakpoints are implemented.

## Elevation & Depth

The page has no raised panels. Standard daisyUI buttons and switch retain their small inset and control shadows; the ghost link is transparent at rest. Dividers establish section boundaries.

## Shapes

Buttons use gently rounded field corners. The switch uses the selector radius plus its padding and border for the track; its thumb retains the selector radius. Dividers are thin (1px). There is no card component.

## Components

- **Default button:** muted cream, green text, semibold label, full width. The notification action has automatic height and a minimum height (44px), so its text can wrap. Hover darkens its background; active state presses it down slightly. Disabled state mutes text and removes its shadow.
- **Ghost link:** a full-width settings link with button dimensions, transparent at rest. Retains daisyUI hover, focus, and active treatments.
- **Switch:** standard daisyUI checkbox toggle. Checked state moves the green thumb right; disabled state reduces opacity. Starts disabled while settings load.
- **Focus and motion:** visible keyboard focus uses a green outline (2px) with an offset (3px). Controls retain their built-in state transitions; reduced-motion preference sets transition duration to zero.
- **Feedback:** polite live status messages accompany settings; errors use an alert. Hidden content is removed from layout.

## Do's and Don'ts

- Do retain platform-native typography and the existing cream-and-green tokens.
- Do keep controls and their explanations together in the single column.
- Do preserve visible focus, disabled states, live feedback, and reduced-motion handling.
- Don't treat unused daisyUI theme colors or components as established LinkedOut patterns.
- Don't replace precise operational explanations with sarcastic copy.
