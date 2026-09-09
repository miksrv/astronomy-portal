import { RefObject, useEffect, useRef, useState } from 'react'

import { loadMeteorShowers, MeteorShower } from './meteorShowers'

export interface UseMeteorShowersLayerOptions {
    showSettings?: boolean
    /** The "meteor shower radiants" setting */
    enabled: boolean
    /** True once Celestial.display() has run (see useCelestialDisplay) */
    initializedRef: RefObject<boolean>
}

export interface MeteorShowersLayerController {
    meteorShowers: MeteorShower[] | null
    /** Mirror of `meteorShowers` for callbacks registered once with Celestial */
    showersRef: RefObject<MeteorShower[] | null>
}

/**
 * Meteor showers layer (FE-9): the catalog is fetched only when the layer is first
 * switched on (Business Rule 11), then drawn by the custom-layers drawer on every redraw.
 */
export const useMeteorShowersLayer = ({
    showSettings,
    enabled,
    initializedRef
}: UseMeteorShowersLayerOptions): MeteorShowersLayerController => {
    const [meteorShowers, setMeteorShowers] = useState<MeteorShower[] | null>(null)

    const showersRef = useRef<MeteorShower[] | null>(meteorShowers)
    showersRef.current = meteorShowers

    useEffect(() => {
        if (!showSettings || !enabled || meteorShowers) {
            return
        }

        let cancelled = false

        void loadMeteorShowers().then((list) => {
            if (!cancelled) {
                setMeteorShowers(list)
            }
        })

        return () => {
            cancelled = true
        }
    }, [showSettings, enabled, meteorShowers])

    useEffect(() => {
        if (showSettings && initializedRef.current) {
            Celestial.redraw()
        }
    }, [showSettings, meteorShowers, enabled])

    return { meteorShowers, showersRef }
}
