import { RefObject, useEffect, useRef } from 'react'

import { loadMeteorShowers, MeteorShower } from './meteorShowers'

export interface UseMeteorShowersLayerOptions {
    showSettings?: boolean
    /** The "meteor shower radiants" setting */
    enabled: boolean
    /** True once Celestial.display() has run (see useCelestialDisplay) */
    initializedRef: RefObject<boolean>
}

export interface MeteorShowersLayerController {
    /** The catalog once loaded; read at draw/hit-test time by the once-registered Celestial callbacks */
    showersRef: RefObject<MeteorShower[] | null>
}

/**
 * Meteor showers layer (FE-9): the catalog is fetched only when the layer is first
 * switched on (Business Rule 11), then drawn by the custom-layers drawer on every redraw.
 * Nothing in the render tree depends on the catalog, so it lives in a ref: the one redraw
 * needed is the one that first paints the radiants, once the file arrives. Toggling the
 * layer on/off later is redrawn by the settings patch (useCelestialDisplay) like any
 * other checkbox.
 */
export const useMeteorShowersLayer = ({
    showSettings,
    enabled,
    initializedRef
}: UseMeteorShowersLayerOptions): MeteorShowersLayerController => {
    const showersRef = useRef<MeteorShower[] | null>(null)

    useEffect(() => {
        if (!showSettings || !enabled || showersRef.current) {
            return
        }

        let cancelled = false

        // loadMeteorShowers caches its promise, so a StrictMode re-run costs nothing
        void loadMeteorShowers().then((list) => {
            if (cancelled) {
                return
            }

            showersRef.current = list

            if (initializedRef.current) {
                Celestial.redraw()
            }
        })

        return () => {
            cancelled = true
        }
    }, [showSettings, enabled, initializedRef])

    return { showersRef }
}
