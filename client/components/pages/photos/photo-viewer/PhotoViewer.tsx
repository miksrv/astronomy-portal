import React, { useEffect, useRef, useState } from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { formatCalendarDate } from '@/utils/dates'
import { FieldOfView, formatAngle, pickScaleBar } from '@/utils/optics'

import { PhotoAnnotations } from '../photo-annotations'
import { PhotoCompare } from '../photo-compare'
import { PhotoSkyObject, PhotoVersion } from '../types'

import styles from './styles.module.sass'

// The lightbox is needed only on click: keep it out of the page's first load
const PhotoLightbox = dynamic(() => import('@/components/common/photo-lightbox').then((m) => m.PhotoLightbox), {
    ssr: false
})

interface PhotoViewerProps {
    /** The photo of the page */
    current: PhotoVersion
    /** What the picture shows, for the alt text and the lightbox caption */
    title: string
    /** The neighbours in the gallery's order (the newest first), for the arrows */
    previousId?: string
    nextId?: string
    /** The other processings of the same object, the newest first */
    versions: PhotoVersion[]
    /** The version shown on the left of the before/after slider; none - the slider is off */
    compareId?: string
    onCompareChange: (id?: string) => void
    /** The sky the picture covers, for the scale bar */
    field?: FieldOfView
    /** The plate solve, for the object labels and the coordinate grid */
    astrometry?: ApiModel.SolvedAstrometry
    /** Our objects around the picture's centre, to label the ones on it */
    skyObjects?: PhotoSkyObject[]
}

/**
 * The photo page's first screen: the picture as large as the window's height allows, within the
 * content column, on the camera's black that spans the window, with its tools (full screen with
 * zoom, the before/after slider against an earlier processing, a scale bar). The page header is
 * over it, the label under it.
 */
export const PhotoViewer: React.FC<PhotoViewerProps> = ({
    current,
    title,
    previousId,
    nextId,
    versions,
    compareId,
    onCompareChange,
    field,
    astrometry,
    skyObjects
}) => {
    const { t, i18n } = useTranslation()
    const pictureRef = useRef<HTMLDivElement>(null)

    const [lightbox, setLightbox] = useState(false)
    const [showScale, setShowScale] = useState(false)
    // A solved picture opens with its objects named and the grid on; the buttons turn them off
    const [showAnnotations, setShowAnnotations] = useState(true)
    const [showGrid, setShowGrid] = useState(true)
    const [pictureWidth, setPictureWidth] = useState(0)

    const compareWith = versions.find(({ id }) => id === compareId)
    // Before/after reads best against the previous processing; the newest one if this is the first
    const defaultCompare = versions.find(({ date }) => (date ?? '') < (current.date ?? '')) ?? versions[0]
    const scaleBar =
        showScale && field && pictureWidth ? pickScaleBar(field.width / pictureWidth, pictureWidth / 4) : undefined

    // The scale bar's length depends on how wide the picture is drawn
    useEffect(() => {
        const picture = pictureRef.current

        if (!picture || !showScale) {
            return
        }

        const observer = new ResizeObserver(([entry]) => setPictureWidth(entry?.contentRect.width ?? 0))
        observer.observe(picture)

        return () => observer.disconnect()
    }, [showScale])

    const ratio = current.width && current.height ? current.width / current.height : 4 / 3

    return (
        <div className={styles.photoViewer}>
            <div className={styles.stage}>
                <div
                    ref={pictureRef}
                    className={styles.picture}
                    style={{ '--photo-ratio': String(ratio) } as React.CSSProperties}
                >
                    {compareWith ? (
                        <PhotoCompare
                            current={current}
                            other={compareWith}
                            title={title}
                        />
                    ) : (
                        <Button
                            unstyled={true}
                            className={styles.frame}
                            aria-label={t('components.pages.photos.photo-viewer.zoom', 'Открыть снимок на весь экран')}
                            onClick={() => setLightbox(true)}
                        >
                            {/* Fetched through the image optimizer; the original is several MB.
                                    The medium file shows as the background until it loads */}
                            <Image
                                className={styles.image}
                                src={current.large}
                                alt={t('components.pages.photos.photo-viewer.alt', 'Астрофото {{title}} от {{date}}', {
                                    title,
                                    date: formatCalendarDate(current.date, i18n.language)
                                })}
                                fill={true}
                                sizes={'(max-width: 768px) 100vw, 1200px'}
                                preload={true}
                                loading={'eager'}
                                style={{ backgroundImage: `url(${current.src})` }}
                            />
                        </Button>
                    )}

                    {astrometry && (showAnnotations || showGrid) && !compareWith && (
                        <PhotoAnnotations
                            astrometry={astrometry}
                            objects={skyObjects}
                            showObjects={showAnnotations}
                            showGrid={showGrid}
                        />
                    )}

                    {scaleBar && !compareWith && (
                        <span
                            className={styles.scaleBar}
                            style={{ '--bar-width': `${scaleBar.px}px` } as React.CSSProperties}
                        >
                            <i aria-hidden={'true'} />
                            {formatAngle(scaleBar.degrees, i18n.language)}
                        </span>
                    )}
                </div>

                <div className={styles.tools}>
                    {!!versions.length && (
                        <Button
                            mode={compareWith ? 'primary' : 'secondary'}
                            size={'small'}
                            icon={'Layers'}
                            aria-pressed={!!compareWith}
                            label={
                                compareWith
                                    ? t('components.pages.photos.photo-viewer.compare-close', 'Закрыть сравнение')
                                    : t('components.pages.photos.photo-viewer.compare', 'Сравнить с {{year}}', {
                                          year: defaultCompare?.date?.slice(0, 4) ?? ''
                                      })
                            }
                            onClick={() => onCompareChange(compareWith ? undefined : defaultCompare?.id)}
                        />
                    )}
                    {astrometry && !compareWith && (
                        <Button
                            mode={showAnnotations ? 'primary' : 'secondary'}
                            size={'small'}
                            icon={'Tag'}
                            aria-pressed={showAnnotations}
                            label={t('components.pages.photos.photo-viewer.annotations', 'Объекты')}
                            tooltip={t(
                                'components.pages.photos.photo-viewer.annotations-tooltip',
                                'Подписать объекты на снимке (astrometry.net)'
                            )}
                            onClick={() => setShowAnnotations((value) => !value)}
                        />
                    )}
                    {astrometry?.wcs && !compareWith && (
                        <Button
                            mode={showGrid ? 'primary' : 'secondary'}
                            size={'small'}
                            icon={'Position'}
                            aria-pressed={showGrid}
                            label={t('components.pages.photos.photo-viewer.grid', 'Сетка')}
                            tooltip={t(
                                'components.pages.photos.photo-viewer.grid-tooltip',
                                'Координатная сетка RA/Dec'
                            )}
                            onClick={() => setShowGrid((value) => !value)}
                        />
                    )}
                    {field && !compareWith && (
                        <Button
                            mode={showScale ? 'primary' : 'secondary'}
                            size={'small'}
                            icon={'Ruler'}
                            aria-pressed={showScale}
                            tooltip={t('components.pages.photos.photo-viewer.scale', 'Угловой масштаб')}
                            onClick={() => setShowScale((value) => !value)}
                        />
                    )}
                    <Button
                        mode={'secondary'}
                        size={'small'}
                        icon={'FullscreenIn'}
                        tooltip={t('components.pages.photos.photo-viewer.fullscreen', 'На весь экран, с увеличением')}
                        onClick={() => setLightbox(true)}
                    />
                </div>

                {previousId && (
                    <Link
                        href={`/photos/${previousId}`}
                        className={cn(styles.arrow, styles.arrowPrevious)}
                        aria-label={t('components.pages.photos.photo-viewer.previous', 'Предыдущий снимок')}
                    >
                        <Icon name={'KeyboardLeft'} />
                    </Link>
                )}
                {nextId && (
                    <Link
                        href={`/photos/${nextId}`}
                        className={cn(styles.arrow, styles.arrowNext)}
                        aria-label={t('components.pages.photos.photo-viewer.next', 'Следующий снимок')}
                    >
                        <Icon name={'KeyboardRight'} />
                    </Link>
                )}
            </div>

            {lightbox && (
                <PhotoLightbox
                    photos={[
                        {
                            src: current.large,
                            preview: current.src,
                            width: current.width || 1280,
                            height: current.height || 1024,
                            title
                        }
                    ]}
                    showLightbox={lightbox}
                    onCloseLightBox={() => setLightbox(false)}
                />
            )}
        </div>
    )
}
