/**
 * Shared mechanism that makes a form validation error impossible to miss on
 * a long form - scrolls the first invalid field into view and focuses it,
 * instead of leaving the only signal an inline message the user has already
 * scrolled past (typically toward the Save button at the bottom).
 *
 * Used from two call sites in every form that adopts this pattern:
 *   1. `handleSubmit(onValid, onInvalid)`'s `onInvalid` callback - fires when
 *      client-side (zod) validation rejects the submit attempt.
 *   2. `useSyncApiFieldErrors`'s `aliases` param - fires once server-side
 *      field errors are synced into the form.
 *
 * `Input`/`TextArea`/`Checkbox` spread the RHF field's `name` straight onto
 * their native element, so `[name="x"]` finds them directly. Custom widgets
 * that don't (`Select`, `DateTimeInput`) need an explicit `data-testid`
 * matching the field name added at the call site - see `aliases` for widgets
 * (like `DateTimeInput`) whose existing `data-testid` doesn't equal the RHF
 * field name.
 */

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

/**
 * Walks a react-hook-form `errors` tree (or a plain server `fieldErrors` map)
 * and returns every leaf error's dotted field path (e.g. `filters.0.frames`),
 * in the object's own key order - which, for a zod-resolved form, tracks
 * schema declaration order closely enough to approximate visual order.
 */
export const flattenFieldErrorPaths = (node: unknown, prefix = ''): string[] => {
    if (!node || typeof node !== 'object') {
        return []
    }

    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
        if (!value || typeof value !== 'object') {
            return []
        }

        const path = prefix ? `${prefix}.${key}` : key

        if ('message' in value || 'type' in value) {
            return [path]
        }

        return flattenFieldErrorPaths(value, path)
    })
}

/**
 * Scrolls+focuses the first field among `fieldPaths` that can be found in the
 * DOM, trying (in order) `name="x"`, `data-testid="x"`, `data-testid="x-trigger"`
 * (the pattern `DateTimeInput` uses for its trigger button). `aliases` maps
 * an RHF field path to the selector value to use instead, for widgets whose
 * `data-testid` doesn't already equal the field name. Returns `true` once a
 * field was found and scrolled to.
 */
export const scrollToFirstFieldError = (fieldPaths: string[], aliases: Record<string, string> = {}): boolean => {
    if (typeof document === 'undefined') {
        return false
    }

    for (const fieldPath of fieldPaths) {
        const selectorName = aliases[fieldPath] ?? fieldPath
        const el = document.querySelector<HTMLElement>(
            `[name="${selectorName}"], [data-testid="${selectorName}"], [data-testid="${selectorName}-trigger"]`
        )

        if (el) {
            // Optional chaining: jsdom (the test environment) doesn't implement
            // `scrollIntoView` at all - a no-op there is fine, the assertion
            // that matters in tests is the inline field message itself.
            el.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
            el.focus?.({ preventScroll: true })
            return true
        }
    }

    return false
}
