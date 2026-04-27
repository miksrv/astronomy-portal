# Frontend Dev Memory Index

- [project.md](./project.md) — Core tech stack and architecture overview (Next.js 16 pages dir, React 19, Redux Toolkit, Sass modules, next-i18next)
- [feedback_i18n_locale_build.md](./feedback_i18n_locale_build.md) — Never edit locale JSON directly; add t() calls in source then run yarn locales:build
- [feedback_static_pages.md](./feedback_static_pages.md) — Static pages use wrapper.getStaticProps (not getServerSideProps) with revalidate:86400
- [feedback_package_upgrade_constraints.md](./feedback_package_upgrade_constraints.md) — eslint pinned to v9 (v10 breaks eslint-plugin-react); next-seo pinned to v6 (v7 is full rewrite); TS6 tsconfig fixes; resolutions override for @typescript-eslint/utils
