---
name: project-overview
description: Core facts about the astronomy-portal frontend project architecture and tech stack
type: project
---

Next.js 16 app router pages dir (NOT app dir), React 19, TypeScript strict mode, Redux Toolkit + RTK Query, next-redux-wrapper for SSR hydration, next-i18next for i18n (ru/en), Sass modules, echarts-for-react for charts, embla-carousel, yet-another-react-lightbox, simple-react-ui-kit component library.

**Why:** Understanding this helps avoid framework-wrong suggestions (e.g. no app-dir conventions, no server components).
**How to apply:** All pages use getServerSideProps + wrapper.getServerSideProps. State is managed via Redux store with HYDRATE. Styling is Sass modules. No Tailwind. Only one test file exists (coordinates.test.ts).
