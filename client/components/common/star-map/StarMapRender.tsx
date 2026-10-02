import React, { useEffect, useId, useRef, useState } from 'react'
import { Button, cn, Container, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { FitViewIcon, ZoomInIcon, ZoomOutIcon } from '@/components/icons'
import { createMediumPhotoUrl } from '@/utils/photos'

import { POPUP_ARROW_SIZE, POPUP_HEIGHT, POPUP_WIDTH } from './constants'
import { StarMapProps } from './StarMap'
import StarMapGeoNudge from './StarMapGeoNudge'
import StarMapLinkPanel from './StarMapLinkPanel'
import StarMapLocationControl from './StarMapLocationControl'
import StarMapObjectInfo from './StarMapObjectInfo'
import StarMapQuickBar from './StarMapQuickBar'
import StarMapSearch from './StarMapSearch'
import StarMapSettingsForm from './StarMapSettingsForm'
import StarMapStatusChip from './StarMapStatusChip'
import { useBodyLabels } from './useBodyLabels'
import { useCanvasInteraction } from './useCanvasInteraction'
import { useCelestialDisplay } from './useCelestialDisplay'
import { useCustomLayers } from './useCustomLayers'
import { useGeoNudge } from './useGeoNudge'
import { useHorizonNavigation } from './useHorizonNavigation'
import { useMeteorShowersLayer } from './useMeteorShowersLayer'
import { usePermalinkSync } from './usePermalinkSync'
import { useStarMapPopup } from './useStarMapPopup'
import { useStarMapSettings } from './useStarMapSettings'
import { useTimeFlow } from './useTimeFlow'
import { dsoCatalogFile, getPopupArrowTop } from './utils'

import styles from './styles.module.sass'

const StarMapRender: React.FC<StarMapProps> = ({
    objects,
    zoom,
    interactive,
    className,
    config,
    showSettings,
    fitContainer,
    onUiHiddenChange
}) => {
    const { t, i18n } = useTranslation()
    const bodyLabels = useBodyLabels()

    const ref = useRef<HTMLDivElement>(null)

    const {
        settings,
        settingsRef,
        centerRef,
        viewRef,
        permalinkZoomRef,
        location,
        date,
        dateRef,
        handleSettingsChange,
        updateSettings
    } = useStarMapSettings({ showSettings })

    // The time model: the map's clock and how fast it runs (the ×2/×8 buttons). Above real
    // time the animated flow in useCelestialDisplay advances the clock frame by frame.
    const { timeRate, nowRef, resolveDate, changeTimeRate, pauseTimeFlow, selectDate } = useTimeFlow({
        dateRef,
        setDate: location.setDate
    })

    // Closed on every screen: the map is what a visitor comes for, the panel is one tap away
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    // "Hide UI" (screenshot mode): hides every overlay control, leaving only the sky
    // and a single restore button — the map itself stays fully interactive
    const [uiHidden, setUiHidden] = useState(false)

    // Let page-level overlays outside this element (the /starmap intro card) follow the toggle
    useEffect(() => {
        onUiHiddenChange?.(uiHidden)
    }, [uiHidden, onUiHiddenChange])

    const {
        popup,
        popupRef,
        hidePopup,
        openPendingPopup,
        scheduleAutoHideAfterRedraw,
        extendAutoHideGrace,
        clearPopupTimers
    } = useStarMapPopup({ containerRef: ref, settingsRef })

    const getPhotoData = API.usePhotosGetListQuery({ object: popup?.object, limit: 1 }, { skip: !popup?.object })

    const {
        initializedRef,
        drawCustomLayersRef,
        zoomIn,
        zoomOut,
        zoomBy,
        applyHorizonView,
        measureViewScale,
        ensureLookAroundZoom,
        fitView
    } = useCelestialDisplay({
        containerRef: ref,
        objects,
        zoom,
        config,
        language: i18n?.language,
        showSettings,
        fitContainer,
        settings,
        settingsRef,
        centerRef,
        viewRef,
        permalinkZoomRef,
        date,
        dateRef,
        nowRef,
        resolveDate,
        timeRate,
        onRedraw: scheduleAutoHideAfterRedraw,
        clearPopupTimers,
        extendAutoHideGrace
    })

    // Horizon mode: looking around the local sky instead of Celestial's free equatorial
    // trackball, so the ground and the horizon always stay in the horizontal plane
    useHorizonNavigation({
        containerRef: ref,
        enabled: Boolean(showSettings) && interactive !== false && settings.viewMode === 'horizon',
        viewRef,
        applyView: applyHorizonView,
        measureScale: measureViewScale,
        onLeaveDome: ensureLookAroundZoom,
        zoomBy
    })

    const { showersRef } = useMeteorShowersLayer({
        showSettings,
        enabled: settings.meteorShowersShow,
        initializedRef
    })

    useCustomLayers({
        drawCustomLayersRef,
        showSettings,
        settingsRef,
        viewRef,
        showersRef,
        resolveDate,
        language: i18n?.language
    })

    const { linkCopied, manualLinkUrl, closeManualLink, handleCopyLink } = usePermalinkSync({
        showSettings,
        settings,
        settingsRef,
        centerRef,
        viewRef,
        date,
        dateRef,
        initializedRef
    })

    // Horizon-mode geolocation nudge (Business Rule 3): the browser prompt fires only from
    // its explicit button, never from the mode switch itself
    const geoNudge = useGeoNudge({
        enabled: Boolean(showSettings),
        settings,
        requestBrowserLocation: location.requestBrowserLocation,
        onGeoposChange: (geopos) => updateSettings({ geopos })
    })

    const isHorizon = settings.viewMode === 'horizon'

    const { selectSearchItem } = useCanvasInteraction({
        containerRef: ref,
        interactive,
        showSettings,
        objects,
        settingsRef,
        showersRef,
        bodyLabels,
        language: i18n?.language,
        resolveDate,
        hidePopup,
        openPendingPopup
    })

    // A bottom sheet (settings / search / manual link) is open — on mobile it covers the
    // lower half of the map, where the popup would otherwise show through
    const sheetOpen = settingsOpen || searchOpen || Boolean(manualLinkUrl)

    // Targets for the icon-only toolbar buttons' aria-controls
    const panelIdBase = useId()
    const settingsPanelId = `${panelIdBase}-settings`
    const searchPanelId = `${panelIdBase}-search`

    const settingsTitle = t('components.common.star-map.settings.title', 'Настройки карты')
    const searchTitle = t('components.common.star-map.search.title', 'Поиск по небу')
    const linkTitle = linkCopied
        ? t('components.common.star-map.link-copied', 'Ссылка скопирована')
        : t('components.common.star-map.copy-link', 'Скопировать ссылку')

    // Docked settings sidebar (settings-page mode only). It lives OUTSIDE #celestial-map so
    // it takes real layout width and the map shrinks next to it, instead of covering the
    // sky as an overlay; the fitContainer ResizeObserver in useCelestialDisplay picks up
    // the width change. On mobile the same element is turned into a bottom sheet by CSS.
    const settingsSidebar = showSettings && !uiHidden && settingsOpen && (
        <aside
            id={settingsPanelId}
            className={styles.settingsSidebar}
        >
            <StarMapSettingsForm
                settings={settings}
                onChange={handleSettingsChange}
                locationControl={
                    <StarMapLocationControl
                        geopos={settings.geopos}
                        date={location.date}
                        timeZone={location.timeZone}
                        timeZonePending={location.timeZonePending}
                        geolocationPending={location.geolocationPending}
                        timeRate={timeRate}
                        resolveDate={resolveDate}
                        onGeoposChange={(geopos) => updateSettings({ geopos })}
                        onDateChange={selectDate}
                        onTimeRateChange={changeTimeRate}
                        onTimeFlowPause={pauseTimeFlow}
                        onEnsureTimeZone={location.ensureTimeZone}
                        onRequestBrowserLocation={location.requestBrowserLocation}
                    />
                }
            />
        </aside>
    )

    // Without the settings UI (object/photo pages) the map is rendered exactly as before:
    // #celestial-map is the root and receives the caller's className directly.
    const map = (
        <div
            ref={ref}
            id={'celestial-map'}
            className={cn(
                styles.starMap,
                fitContainer && styles.starMapFit,
                showSettings && settings.viewMode === 'horizon' && styles.starMapHorizon,
                uiHidden && styles.uiHidden,
                showSettings && sheetOpen && styles.starMapSheetOpen,
                !showSettings && className
            )}
        >
            {showSettings && (
                // One rail for every map action, on every screen: a single vertical glass
                // column in the top-left corner (view controls, then the panel buttons).
                // Mobile only grows the buttons to a 40px thumb target. In hide-UI mode the
                // rail collapses to its single "show UI" toggle (.mapRailHidden).
                <div className={cn(styles.mapRail, uiHidden && styles.mapRailHidden)}>
                    <div
                        className={styles.viewControls}
                        role={'group'}
                    >
                        <Button
                            mode={'secondary'}
                            tooltip={{
                                content: t('components.common.star-map.toolbar.zoom-in', 'Приблизить'),
                                placement: 'right'
                            }}
                            className={styles.railButton}
                            onClick={zoomIn}
                        >
                            <ZoomInIcon />
                        </Button>
                        <Button
                            mode={'secondary'}
                            tooltip={{
                                content: t('components.common.star-map.toolbar.zoom-out', 'Отдалить'),
                                placement: 'right'
                            }}
                            className={styles.railButton}
                            onClick={zoomOut}
                        >
                            <ZoomOutIcon />
                        </Button>
                        {/* Sky mode only: there "fit view" resets a zoom the visitor can
                            otherwise only undo by hand. Horizon mode opens at its own fitted
                            zoom and cannot be zoomed out past it, and the whole-sky dome is
                            reached by simply looking up — so the button has nothing to fix. */}
                        {!isHorizon && (
                            <Button
                                mode={'secondary'}
                                tooltip={{
                                    content: t('components.common.star-map.toolbar.fit-view', 'Вписать вид'),
                                    placement: 'right'
                                }}
                                className={styles.railButton}
                                onClick={fitView}
                            >
                                <FitViewIcon />
                            </Button>
                        )}
                        {/* Screenshot mode toggle — the only rail button left visible while the
                            UI is hidden (see .mapRailHidden), otherwise there is no way back */}
                        <Button
                            icon={'Eye'}
                            mode={'secondary'}
                            tooltip={{
                                content: uiHidden
                                    ? t('components.common.star-map.show-ui', 'Показать интерфейс')
                                    : t('components.common.star-map.hide-ui', 'Скрыть интерфейс'),
                                placement: 'right'
                            }}
                            aria-pressed={uiHidden}
                            className={cn(
                                styles.railButton,
                                styles.railToggleUi,
                                uiHidden && styles.toolbarButtonActive
                            )}
                            onClick={() => setUiHidden((prev) => !prev)}
                        />
                    </div>

                    {/* Panels: settings, sky search, permalink */}
                    <div className={styles.mapToolbar}>
                        <Button
                            icon={'Settings'}
                            mode={'secondary'}
                            tooltip={{ content: settingsTitle, placement: 'right' }}
                            aria-expanded={settingsOpen}
                            aria-controls={settingsPanelId}
                            className={cn(styles.toolbarButton, settingsOpen && styles.toolbarButtonActive)}
                            onClick={() => setSettingsOpen((prev) => !prev)}
                        />
                        <Button
                            icon={'Search'}
                            mode={'secondary'}
                            tooltip={{ content: searchTitle, placement: 'right' }}
                            aria-expanded={searchOpen}
                            aria-controls={searchPanelId}
                            className={cn(styles.toolbarButton, searchOpen && styles.toolbarButtonActive)}
                            onClick={() => setSearchOpen((prev) => !prev)}
                        />
                        <Button
                            icon={linkCopied ? 'CheckCircle' : 'Link'}
                            mode={'secondary'}
                            tooltip={{ content: linkTitle, placement: 'right' }}
                            className={styles.toolbarButton}
                            onClick={handleCopyLink}
                        />
                    </div>
                </div>
            )}

            {showSettings && !uiHidden && (
                <StarMapQuickBar
                    settings={settings}
                    onChange={handleSettingsChange}
                    sheetOpen={sheetOpen}
                />
            )}

            {showSettings && !uiHidden && (
                <StarMapGeoNudge
                    status={geoNudge.status}
                    geolocationPending={location.geolocationPending}
                    onLocate={() => void geoNudge.locate()}
                    onDismiss={geoNudge.dismiss}
                />
            )}

            {showSettings && (
                <StarMapStatusChip
                    geopos={settings.geopos}
                    date={date}
                    timeZone={location.timeZone}
                    timeZonePending={location.timeZonePending}
                    timeRate={timeRate}
                    resolveDate={resolveDate}
                    onResetToNow={() => selectDate(null)}
                    onOpenSettings={() => setSettingsOpen(true)}
                />
            )}

            {showSettings && !uiHidden && (
                // display:contents — a box-less wrapper that only lends the search panel
                // the id the toolbar button's aria-controls points at
                <div
                    id={searchPanelId}
                    style={{ display: 'contents' }}
                >
                    <StarMapSearch
                        open={searchOpen}
                        objects={objects}
                        dsoCatalogFile={dsoCatalogFile(settings)}
                        onSelect={(item) => {
                            setSearchOpen(false)
                            selectSearchItem(item)
                        }}
                        onClose={() => setSearchOpen(false)}
                    />
                </div>
            )}

            {showSettings && !uiHidden && (
                <StarMapLinkPanel
                    url={manualLinkUrl}
                    onClose={closeManualLink}
                />
            )}

            <div
                className={cn(
                    styles.popupArrow,
                    popup.placement === 'above' ? styles.popupArrowDown : styles.popupArrowUp,
                    popup.visible && popup.positioned && styles.popupArrowVisible
                )}
                style={{
                    left: popup.x + popup.arrowOffset - POPUP_ARROW_SIZE,
                    top: getPopupArrowTop(popup.y, popup.height, popup.placement)
                }}
            />

            <Container
                ref={popupRef}
                className={cn(
                    styles.popup,
                    popup.info && styles.popupInfo,
                    popup.visible && popup.positioned && styles.popupVisible
                )}
                style={{
                    left: popup.x,
                    top: popup.y
                }}
            >
                <Button
                    icon={'Close'}
                    mode={'secondary'}
                    tooltip={t('components.common.star-map.close', 'Закрыть')}
                    className={styles.popupClose}
                    onClick={hidePopup}
                />
                {popup.info ? (
                    <StarMapObjectInfo
                        info={popup.info}
                        date={popup.infoDate ?? new Date()}
                    />
                ) : getPhotoData.isFetching || getPhotoData.isLoading ? (
                    <Skeleton style={{ width: '100%', height: '100%' }} />
                ) : (
                    <>
                        <Image
                            alt={popup.name || ''}
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            src={
                                getPhotoData?.data?.items?.[0]?.fileName
                                    ? createMediumPhotoUrl(getPhotoData.data?.items?.[0])
                                    : '/images/no-photo.png'
                            }
                            width={POPUP_WIDTH}
                            height={POPUP_HEIGHT}
                        />
                        <div className={styles.popout}>
                            <Link
                                href={`/objects/${popup.object}`}
                                title={popup.name}
                                className={styles.popoutLink}
                            >
                                {popup.name}
                            </Link>
                        </div>
                    </>
                )}
            </Container>
        </div>
    )

    if (!showSettings) {
        return map
    }

    return (
        <div className={cn(styles.starMapShell, fitContainer && styles.starMapShellFit, className)}>
            {settingsSidebar}
            {map}
        </div>
    )
}

export default StarMapRender
