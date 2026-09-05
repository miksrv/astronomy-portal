import React, { useEffect, useRef, useState } from 'react'
import { Button, cn, Container, Icon, Skeleton } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { FitViewIcon, HorizonIcon, ZoomInIcon, ZoomOutIcon } from '@/components/icons'
import { createMediumPhotoUrl } from '@/utils/photos'

import { MOBILE_MAX_WIDTH, POPUP_ARROW_SIZE, POPUP_HEIGHT, POPUP_WIDTH } from './constants'
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
import { getPopupArrowTop } from './utils'

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
        handleSettingsChange
    } = useStarMapSettings({ showSettings })

    const [settingsOpen, setSettingsOpen] = useState<boolean>(() => {
        if (!showSettings) {
            return false
        }
        // On desktop — open by default; on mobile — closed
        return typeof window !== 'undefined' && window.innerWidth > MOBILE_MAX_WIDTH
    })
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
        nowRef,
        resolveDate,
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
        dateRef,
        nowRef,
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
        onGeoposChange: (geopos) => handleSettingsChange({ ...settings, geopos })
    })

    const isHorizon = settings.viewMode === 'horizon'
    const toggleViewMode = () => handleSettingsChange({ ...settings, viewMode: isHorizon ? 'sky' : 'horizon' })
    const viewModeLabel = isHorizon
        ? t('components.common.star-map.toolbar.sky-map', 'Карта неба')
        : t('components.common.star-map.toolbar.sky-above', 'Небо над вами')
    // The 54px FAB circle fits only a very short caption; the full label stays in title/aria
    const viewModeShortLabel = isHorizon
        ? t('components.common.star-map.toolbar.sky-map-short', 'Карта')
        : t('components.common.star-map.toolbar.sky-above-short', 'Над вами')

    const { selectSearchItem } = useCanvasInteraction({
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

    // Docked settings sidebar (settings-page mode only). It lives OUTSIDE #celestial-map so
    // it takes real layout width and the map shrinks next to it, instead of covering the
    // sky as an overlay; the fitContainer ResizeObserver in useCelestialDisplay picks up
    // the width change. On mobile the same element is turned into a bottom sheet by CSS.
    const settingsSidebar = showSettings && !uiHidden && settingsOpen && (
        <aside className={styles.settingsSidebar}>
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
                        onGeoposChange={(geopos) => handleSettingsChange({ ...settings, geopos })}
                        onDateChange={location.setDate}
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
                !showSettings && className
            )}
        >
            {showSettings && (
                // One rail for every map action. Desktop: a single vertical glass column in
                // the top-left corner (view controls, divider, panels). Mobile: the wrapper
                // is display:contents, so the view controls stay a small top-left rail while
                // the panel buttons become the bottom action bar. In hide-UI mode the rail
                // collapses to its single "show UI" toggle (.mapRailHidden).
                <div className={cn(styles.mapRail, uiHidden && styles.mapRailHidden)}>
                    <div
                        className={styles.viewControls}
                        role={'group'}
                    >
                        <Button
                            mode={'secondary'}
                            title={t('components.common.star-map.toolbar.zoom-in', 'Приблизить')}
                            aria-label={t('components.common.star-map.toolbar.zoom-in', 'Приблизить')}
                            className={styles.railButton}
                            onClick={zoomIn}
                        >
                            <ZoomInIcon />
                        </Button>
                        <Button
                            mode={'secondary'}
                            title={t('components.common.star-map.toolbar.zoom-out', 'Отдалить')}
                            aria-label={t('components.common.star-map.toolbar.zoom-out', 'Отдалить')}
                            className={styles.railButton}
                            onClick={zoomOut}
                        >
                            <ZoomOutIcon />
                        </Button>
                        <Button
                            mode={'secondary'}
                            title={t('components.common.star-map.toolbar.fit-view', 'Вписать вид')}
                            aria-label={t('components.common.star-map.toolbar.fit-view', 'Вписать вид')}
                            className={styles.railButton}
                            onClick={fitView}
                        >
                            <FitViewIcon />
                        </Button>
                        {/* Screenshot mode toggle — the only rail button left visible while the
                            UI is hidden (see .mapRailHidden), otherwise there is no way back */}
                        <Button
                            icon={'Eye'}
                            mode={'secondary'}
                            title={
                                uiHidden
                                    ? t('components.common.star-map.show-ui', 'Показать интерфейс')
                                    : t('components.common.star-map.hide-ui', 'Скрыть интерфейс')
                            }
                            aria-label={
                                uiHidden
                                    ? t('components.common.star-map.show-ui', 'Показать интерфейс')
                                    : t('components.common.star-map.hide-ui', 'Скрыть интерфейс')
                            }
                            aria-pressed={uiHidden}
                            className={cn(
                                styles.railButton,
                                styles.railToggleUi,
                                uiHidden && styles.toolbarButtonActive
                            )}
                            onClick={() => setUiHidden((prev) => !prev)}
                        />
                    </div>

                    <div className={styles.railDivider} />

                    <div className={styles.mapToolbar}>
                        <Button
                            icon={'Settings'}
                            mode={'secondary'}
                            title={t('components.common.star-map.settings.title', 'Настройки карты')}
                            className={cn(styles.toolbarButton, settingsOpen && styles.toolbarButtonActive)}
                            onClick={() => setSettingsOpen((prev) => !prev)}
                        >
                            <span className={styles.toolbarLabel}>
                                {t('components.common.star-map.toolbar.settings', 'Настройки')}
                            </span>
                        </Button>
                        <Button
                            icon={'Search'}
                            mode={'secondary'}
                            title={t('components.common.star-map.search.title', 'Поиск по небу')}
                            className={cn(styles.toolbarButton, searchOpen && styles.toolbarButtonActive)}
                            onClick={() => setSearchOpen((prev) => !prev)}
                        >
                            <span className={styles.toolbarLabel}>
                                {t('components.common.star-map.toolbar.search', 'Поиск')}
                            </span>
                        </Button>
                        {/* Mobile-only raised FAB (hidden by CSS on desktop, where the mode toggle
                        lives in the sidebar and the quick bar): sky map ↔ the sky above you */}
                        <Button
                            mode={'primary'}
                            title={viewModeLabel}
                            aria-label={viewModeLabel}
                            aria-pressed={isHorizon}
                            className={cn(styles.toolbarButton, styles.toolbarFabButton)}
                            onClick={toggleViewMode}
                        >
                            {isHorizon ? <Icon name={'Map'} /> : <HorizonIcon />}
                            <span className={styles.toolbarLabel}>{viewModeShortLabel}</span>
                        </Button>
                        <Button
                            icon={linkCopied ? 'CheckCircle' : 'Link'}
                            mode={'secondary'}
                            title={
                                linkCopied
                                    ? t('components.common.star-map.link-copied', 'Ссылка скопирована')
                                    : t('components.common.star-map.copy-link', 'Скопировать ссылку')
                            }
                            className={styles.toolbarButton}
                            onClick={handleCopyLink}
                        >
                            <span className={styles.toolbarLabel}>
                                {linkCopied
                                    ? t('components.common.star-map.link-copied-short', 'Готово')
                                    : t('components.common.star-map.toolbar.link', 'Ссылка')}
                            </span>
                        </Button>
                    </div>
                </div>
            )}

            {showSettings && !uiHidden && (
                <StarMapQuickBar
                    settings={settings}
                    onChange={handleSettingsChange}
                    sheetOpen={settingsOpen || searchOpen || Boolean(manualLinkUrl)}
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
                    onResetToNow={() => location.setDate(null)}
                    onOpenSettings={() => setSettingsOpen(true)}
                />
            )}

            {showSettings && !uiHidden && (
                <StarMapSearch
                    open={searchOpen}
                    objects={objects}
                    dsoCatalogFile={settings.dsosFull ? 'dsos.6.json' : 'dsos.bright.json'}
                    onSelect={(item) => {
                        setSearchOpen(false)
                        selectSearchItem(item)
                    }}
                    onClose={() => setSearchOpen(false)}
                />
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
                    title={t('components.common.star-map.close', 'Закрыть')}
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
