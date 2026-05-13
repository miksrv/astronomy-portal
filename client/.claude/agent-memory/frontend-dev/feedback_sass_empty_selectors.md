---
name: feedback_sass_empty_selectors
description: Empty SASS selectors (no properties) trigger SassWarning at build time; add a comment to silence them
metadata:
    type: feedback
---

Empty SASS class selectors with no properties cause `SassWarning: This selector doesn't have any properties and won't be rendered.` during the Next.js Turbopack build. Fix by adding a comment line inside the empty selector body.

**Why:** Turbopack/sass-loader surfaces these as build warnings even for intentional placeholder classes used only as JSX class name anchors.

**How to apply:** Any time you write a `.className` in a `.sass` file that has no CSS properties (used purely as a JSX ref), add `// layout anchor` or similar comment as the body to suppress the warning.
