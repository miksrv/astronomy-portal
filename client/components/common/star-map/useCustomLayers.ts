import { RefObject, useCallback, useLayoutEffect } from 'react'

import { POINT_RADIUS, stylePoint, styleText } from './constants'
import { drawHorizonOverlay } from './horizonOverlay'
import { HorizonView } from './horizonView'
import { drawMeteorRadiants, MeteorShower } from './meteorShowers'
import { HitResult, StarMapSettings } from './types'
import { useCompassLabels } from './useCompassLabels'

export interface UseCustomLayersOptions {
    /** Slot read by Celestial's end-of-redraw callback (see useCelestialDisplay) */
    drawCustomLayersRef: RefObject<() => void>
    showSettings?: boolean
    settingsRef: RefObject<StarMapSettings>
    /** Horizon mode: the direction the visitor is looking (see useHorizonNavigation) */
    viewRef: RefObject<HorizonView>
    showersRef: RefObject<MeteorShower[] | null>
    /** The moment the map is currently computed for (useCelestialDisplay) */
    resolveDate: () => Date
    language?: string
}

/**
 * The portal's own layers drawn on top of Celestial's output: the portal objects
 * (`.sky-points`), meteor shower radiants (FE-9) and the horizon-mode ground/compass
 * overlay (FE-3). Publishes the drawer into `drawCustomLayersRef` so the once-registered
 * redraw callback always draws with the current props/settings.
 */
export const useCustomLayers = ({
    drawCustomLayersRef,
    showSettings,
    settingsRef,
    viewRef,
    showersRef,
    resolveDate,
    language
}: UseCustomLayersOptions): void => {
    const compassLabels = useCompassLabels()

    const drawCustomLayersInner = useCallback(
        (currentSettings: StarMapSettings) => {
            if (!showSettings || currentSettings.customObjectsShow) {
                Celestial.container.selectAll('.sky-points').each((point: HitResult['point']) => {
                    if (Celestial.clip(point.geometry.coordinates)) {
                        const pointCoords = Celestial.mapProjection(point.geometry.coordinates)

                        Celestial.setStyle(stylePoint)
                        Celestial.context.beginPath()
                        Celestial.context.arc(pointCoords[0], pointCoords[1], POINT_RADIUS, 0, 2 * Math.PI)
                        Celestial.context.closePath()
                        Celestial.context.stroke()
                        Celestial.context.fill()
                        Celestial.setTextStyle(styleText)
                        Celestial.context.fillText(
                            point.properties.name,
                            pointCoords[0] + POINT_RADIUS - 1,
                            pointCoords[1] - POINT_RADIUS + 1
                        )
                    }
                })
            }

            if (showSettings && currentSettings.meteorShowersShow && showersRef.current?.length) {
                drawMeteorRadiants({
                    showers: showersRef.current,
                    date: resolveDate(),
                    language
                })
            }

            if (showSettings && currentSettings.viewMode === 'horizon') {
                drawHorizonOverlay({
                    geopos: currentSettings.geopos,
                    date: resolveDate(),
                    view: viewRef.current,
                    labels: compassLabels
                })
            }
        },
        [showSettings, showersRef, viewRef, resolveDate, language, compassLabels]
    )

    // Drawn from Celestial's end-of-redraw callback (addCallback), NOT from the layer's
    // own redraw hook: the built-in redraw cycle paints the daylight gradient and the
    // horizon fill AFTER user layers, which would bury everything drawn here under the
    // day-sky overlay in horizon mode. The addCallback runs at the very end.
    const drawCustomLayers = useCallback(() => {
        const currentSettings = settingsRef.current

        // Celestial's own redraw leaves the context in whatever state its last layer
        // used — in horizon mode the daylight pass exits with globalAlpha ≈ 0.09, which
        // would render everything below at 9% opacity (i.e. invisibly). Reset and
        // restore so custom layers always draw at full strength.
        const context = Celestial.context
        context.save()
        context.globalAlpha = 1

        try {
            drawCustomLayersInner(currentSettings)
        } finally {
            context.restore()
        }
    }, [settingsRef, drawCustomLayersInner])

    // Published before the display effect can redraw (layout effects run first), and
    // after commit rather than during render, which StrictMode may run twice and discard
    useLayoutEffect(() => {
        drawCustomLayersRef.current = drawCustomLayers
    }, [drawCustomLayersRef, drawCustomLayers])
}
