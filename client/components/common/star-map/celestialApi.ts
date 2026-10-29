/**
 * Thin, defensive readers/wrappers over the vendored d3-celestial global (`Celestial`),
 * shared by the hooks so each of them doesn't re-implement the same guards. Everything
 * here is synchronous and never throws: Celestial is only guaranteed to exist once its
 * scripts have loaded and `display()` has run, so a missing method or a throwing call is
 * reported as "unavailable" (null/undefined) instead of breaking the caller.
 */

/** Current zoom factor relative to the config's base zoomlevel (Celestial.zoomBy() getter), or null. */
export const readZoomFactor = (): number | null => {
    try {
        const factor = Celestial.zoomBy?.()

        return typeof factor === 'number' && Number.isFinite(factor) && factor > 0 ? factor : null
    } catch {
        return null
    }
}

/** Current map center `[ra, dec, orientation]` (Celestial.rotate() getter), or undefined. */
export const readCenter = (): [number, number, number] | undefined => {
    try {
        const center = Celestial.rotate?.()

        return Array.isArray(center) && center.length >= 3 && center.every((value) => Number.isFinite(value))
            ? (center as [number, number, number])
            : undefined
    } catch {
        return undefined
    }
}

/**
 * Run zoom/rotate calls with Celestial's transitions switched off. `disableAnimations`
 * is one of Celestial's own config flags (honoured by zoomBy/rotate), so it is toggled
 * through the public apply() API — each apply() is a full redraw, which is acceptable for
 * the one-off sky-mode resize/fit paths this is used on.
 *
 * `alreadyDisabled` says the flag is permanently on in the running config (horizon mode,
 * see buildVisualConfig): there the two apply() redraws would be wasted — and restoring
 * `false` afterwards would quietly re-enable the animations — so `run` is simply invoked.
 */
export const withoutAnimations = (run: () => void, alreadyDisabled = false): void => {
    if (alreadyDisabled) {
        try {
            run()
        } catch (error) {
            console.warn(error)
        }

        return
    }

    try {
        Celestial.apply({ disableAnimations: true })
        run()
    } catch (error) {
        console.warn(error)
    } finally {
        try {
            Celestial.apply({ disableAnimations: false })
        } catch (error) {
            console.warn(error)
        }
    }
}
