# Frontend Dev Memory Index

- [project.md](./project.md) — Core tech stack and architecture overview (Next.js 16 pages dir, React 19, Redux Toolkit, Sass modules, next-i18next); most pages use getServerSideProps but static ones use getStaticProps, see [[static-pages-use-getstaticprops-via-wrapper]]
- [feedback_i18n_locale_build.md](./feedback_i18n_locale_build.md) — Never edit locale JSON directly; changing an EXISTING key's default text does not auto-propagate to either locale file, must hand-edit both
- [feedback_static_pages.md](./feedback_static_pages.md) — Static pages use wrapper.getStaticProps (not getServerSideProps) with revalidate:86400
- [feedback_package_upgrade_constraints.md](./feedback_package_upgrade_constraints.md) — eslint/next-seo version-pin history, now resolved as of 2026-08-14 — verify current package.json before trusting any pin; resolutions override + TS6 tsconfig notes still valid
- [feedback_simple_react_ui_kit_quirks.md](./feedback_simple_react_ui_kit_quirks.md) — Dialog overlay-click/Escape call onCloseDialog regardless of showCloseButton; Input spreads rest props so `list=` datalist works
- [feedback_sass_and_rtk_query_abort.md](./feedback_sass_and_rtk_query_abort.md) — .sass indented syntax breaks on multi-line comma-continued properties; RTK Query mutation .abort() resolves to {error:{name:'AbortError'}}, never rejects
- [feedback_ts_buffersource_and_public_js_lint.md](./feedback_ts_buffersource_and_public_js_lint.md) — Uint8Array.from() fails BufferSource typing (build-only); new public/*.js files need an eslint.config.mjs ignore entry
