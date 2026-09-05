import { RefObject, useMemo, useRef } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { POINT_RADIUS, stylePoint, styleText } from './constants'
import { drawHorizonOverlay } from './horizonOverlay'
import { HorizonView } from './horizonView'
import { drawMeteorRadiants, MeteorShower } from './meteorShowers'
import { SkyPoint, StarMapSettings } from './types'

export interface UseCustomLayersOptions {
    /** Slot read by Celestial's end-of-redraw callback (see useCelestialDisplay) */
    drawCustomLayersRef: RefObject<() => void>
    showSettings?: boolean
    settingsRef: RefObject<StarMapSettings>
    /** Horizon mode: the direction the visitor is looking (see useHorizonNavigation) */
    viewRef: RefObject<HorizonView>
    showersRef: RefObject<MeteorShower[] | null>
    dateRef: RefObject<Date | null>
    nowRef: RefObject<Date>
    language?: string
}

/**
 * The portal's own layers drawn on top of Celestial's output: the portal objects
 * (`.sky-points`), meteor shower radiants (FE-9) and the horizon-mode ground/compass
 * overlay (FE-3). Publishes the drawer into `drawCustomLayersRef` on every render so the
 * once-registered redraw callback always draws with the current props/settings.
 */
export const useCustomLayers = ({
    drawCustomLayersRef,
    showSettings,
    settingsRef,
    viewRef,
    showersRef,
    dateRef,
    nowRef,
    language
}: UseCustomLayersOptions): void => {
    const { t } = useTranslation()

    const languageRef = useRef(language)
    languageRef.current = language

    const compassLabels = useMemo(
        () => ({
            n: t('components.common.star-map.compass.n', 'С'),
            ne: t('components.common.star-map.compass.ne', 'СВ'),
            e: t('components.common.star-map.compass.e', 'В'),
            se: t('components.common.star-map.compass.se', 'ЮВ'),
            s: t('components.common.star-map.compass.s', 'Ю'),
            sw: t('components.common.star-map.compass.sw', 'ЮЗ'),
            w: t('components.common.star-map.compass.w', 'З'),
            nw: t('components.common.star-map.compass.nw', 'СЗ')
        }),
        [t]
    )
    const compassLabelsRef = useRef(compassLabels)
    compassLabelsRef.current = compassLabels

    const drawCustomLayersInner = (currentSettings: StarMapSettings) => {
        if (!showSettings || currentSettings.customObjectsShow) {
            Celestial.container.selectAll('.sky-points').each((point: SkyPoint) => {
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
                date: dateRef.current ?? nowRef.current,
                language: languageRef.current
            })
        }

        if (showSettings && currentSettings.viewMode === 'horizon') {
            drawHorizonOverlay({
                geopos: currentSettings.geopos,
                date: dateRef.current ?? nowRef.current,
                view: viewRef.current,
                labels: compassLabelsRef.current
            })
        }
    }

    // Drawn from Celestial's end-of-redraw callback (addCallback), NOT from the layer's
    // own redraw hook: the built-in redraw cycle paints the daylight gradient and the
    // horizon fill AFTER user layers, which would bury everything drawn here under the
    // day-sky overlay in horizon mode. The addCallback runs at the very end.
    const drawCustomLayers = () => {
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
    }

    // Kept in a ref so the addCallback closure (registered once) always draws with
    // the current props/objects.
    drawCustomLayersRef.current = drawCustomLayers
}
