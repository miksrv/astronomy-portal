# Frontend Dev Memory Index

- [project.md](./project.md) — pages router only; next-i18next v16 `/pages` import subpath; appWithTranslation config arg
- [feedback_static_pages.md](./feedback_static_pages.md) — static pages use wrapper.getStaticProps with revalidate:86400
- [feedback_i18n_locale_build.md](./feedback_i18n_locale_build.md) — how locales:build merges; changed defaults must be hand-edited in both files; EN of new keys filled by hand
- [feedback_rhf_zod_migration_pattern.md](./feedback_rhf_zod_migration_pattern.md) — RHF+zod form conventions: Controller, NaN sentinel, superRefine, no onChange+isValid gating, useFieldArray, effect deps, --runInBand
- [feedback_simple_react_ui_kit_quirks.md](./feedback_simple_react_ui_kit_quirks.md) — Dialog closes via overlay/Escape regardless of showCloseButton; Input passes rest props; Jest kit mock has no label/id wiring and a stub Select
- [feedback_sass_and_rtk_query_abort.md](./feedback_sass_and_rtk_query_abort.md) — .sass can't do multi-line comma values; aborted RTK mutations resolve with AbortError (use isAbortError)
- [feedback_sass_empty_selectors.md](./feedback_sass_empty_selectors.md) — empty .sass selectors warn at build; put a comment in the body
- [feedback_ts_buffersource_and_public_js_lint.md](./feedback_ts_buffersource_and_public_js_lint.md) — Uint8Array.from() fails BufferSource typing at build; new public/*.js needs an eslint ignore entry
