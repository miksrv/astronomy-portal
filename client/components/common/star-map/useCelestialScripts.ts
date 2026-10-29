import { useEffect, useState } from 'react'

// Load order matters: celestial.min.js expects the d3 globals to already exist.
const CELESTIAL_SCRIPTS = ['/scripts/d3.min.js', '/scripts/d3.geo.projection.min.js', '/scripts/celestial.min.js']

// Module-level so the chain is only ever started once per page load, no matter
// how many <StarMap> instances mount (or how often one remounts).
let scriptsPromise: Promise<void> | null = null

const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)

        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve()
            } else {
                existing.addEventListener('load', () => resolve())
                existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)))
            }
            return
        }

        const script = document.createElement('script')
        script.src = src
        // async=false preserves execution order for dynamically inserted scripts,
        // which lets all three download in parallel while still executing in sequence.
        script.async = false
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true'
            resolve()
        })
        script.addEventListener('error', () => {
            // Remove the dead element so a retry re-creates it instead of waiting
            // forever on load/error events that already fired.
            script.remove()
            reject(new Error(`Failed to load script: ${src}`))
        })
        document.body.appendChild(script)
    })

/**
 * Loads d3 → d3.geo.projection → celestial strictly in order, on demand — only
 * when a <StarMap> actually mounts (previously they loaded globally from _app.tsx
 * on every page of the site). Returns true once the Celestial global is usable.
 */
export const useCelestialScripts = (): boolean => {
    const [ready, setReady] = useState<boolean>(() => typeof Celestial !== 'undefined')

    useEffect(() => {
        if (ready) {
            return
        }

        if (!scriptsPromise) {
            // Insert all three at once: downloads run in parallel, async=false keeps
            // the execution order (d3 → projections → celestial).
            scriptsPromise = Promise.all(CELESTIAL_SCRIPTS.map(loadScript)).then(() => undefined)
        }

        let cancelled = false

        scriptsPromise
            .then(() => {
                if (!cancelled) {
                    setReady(true)
                }
            })
            .catch((error) => {
                // Reset so the next <StarMap> mount can retry after a transient network failure
                scriptsPromise = null
                console.error(error)
            })

        return () => {
            cancelled = true
        }
    }, [ready])

    return ready
}
