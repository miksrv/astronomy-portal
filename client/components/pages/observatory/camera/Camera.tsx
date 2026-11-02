import React, { useEffect, useRef, useState } from 'react'
import { Button, cn, Container, Icon, Spinner } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next/pages'

import { useInView } from '@/hooks/useInView'
import { formatObservatoryTime } from '@/utils/visibility'

import styles from './styles.module.sass'

// The lightbox is needed only on "Fullscreen": keep it out of the page's first load
const PhotoLightbox = dynamic(() => import('@/components/common/photo-lightbox').then((m) => m.PhotoLightbox), {
    ssr: false
})

const DEFAULT_INTERVAL = 5

interface CameraProps {
    cameraURL?: string
    /** Seconds between frames */
    interval?: number
    /** What the camera looks at, shown over the frame */
    label: string
}

/**
 * A live camera of the observatory: the frame reloads on its interval while the tab is
 * visible, with a line running to the next frame. A failed reload keeps the last good frame.
 */
export const Camera: React.FC<CameraProps> = ({ cameraURL, interval = DEFAULT_INTERVAL, label }) => {
    const { t, i18n } = useTranslation()

    // The last frame that loaded and when; empty until the first one arrives
    const [frame, setFrame] = useState<{ src: string; time: Date }>()
    const [lightbox, setLightbox] = useState<boolean>(false)
    // 'loading' until the first frame arrives; a failed refresh keeps the last good frame
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

    // Frames start once the card is near the viewport: the weather above must not wait for them
    const cardRef = useRef<HTMLElement>(null)
    const inView = useInView(cardRef)

    useEffect(() => {
        if (!cameraURL || !inView) {
            return
        }

        let cancelled = false
        let inFlight = false

        // Each frame is loaded off-screen and shown only once it has arrived, so a
        // failed refresh never replaces the picture on screen with a broken image.
        // A slow link gets one request at a time: a tick while one is loading is skipped
        const updateImage = () => {
            if (document.visibilityState === 'hidden' || inFlight) {
                return
            }

            const src = `${cameraURL}?r=${Date.now()}`
            const image = new Image()

            inFlight = true
            image.onload = () => {
                inFlight = false

                if (!cancelled) {
                    setFrame({ src, time: new Date() })
                    setStatus('ready')
                }
            }
            image.onerror = () => {
                inFlight = false

                if (!cancelled) {
                    setStatus('error')
                }
            }
            image.src = src
        }

        // Frames are skipped while the tab is hidden: fetch one as soon as it is shown again
        // instead of waiting out the interval
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                updateImage()
            }
        }

        updateImage()
        const intervalId = setInterval(updateImage, interval * 1000)
        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            cancelled = true
            clearInterval(intervalId)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [cameraURL, interval, inView])

    const unavailable = !cameraURL || (status === 'error' && !frame)

    return (
        <Container
            ref={cardRef}
            className={styles.camera}
            aria-label={label}
            footer={
                <div className={styles.footer}>
                    <span>
                        {t('components.pages.observatory.camera.interval', 'Обновление каждые {{count}} секунд', {
                            count: interval
                        })}
                    </span>
                    <Button
                        mode={'secondary'}
                        size={'small'}
                        icon={'FullscreenIn'}
                        disabled={!frame}
                        label={t('components.pages.observatory.camera.fullscreen', 'Во весь экран')}
                        onClick={() => setLightbox(true)}
                    />
                </div>
            }
        >
            <div className={styles.frame}>
                {frame && (
                    // eslint-disable-next-line next/no-img-element
                    <img
                        src={frame.src}
                        alt={t('components.pages.observatory.camera.image-alt', 'Кадр камеры: {{label}}', { label })}
                    />
                )}

                {status === 'loading' && !unavailable && <Spinner className={styles.spinner} />}

                {unavailable && (
                    <div className={styles.off}>
                        <Icon name={'Camera'} />
                        {t('components.pages.observatory.camera.camera-not-available', 'Камера недоступна')}
                    </div>
                )}

                <span className={cn(styles.pill, styles.pillLeft)}>
                    <span
                        className={cn(styles.dot, frame && status !== 'error' && styles.live)}
                        aria-hidden={'true'}
                    />
                    {`${t('components.pages.observatory.camera.live', 'В ЭФИРЕ')} · ${label}`}
                </span>

                {frame && (
                    <span className={cn(styles.pill, styles.pillRight)}>
                        {status === 'error'
                            ? t('components.pages.observatory.camera.stale', 'кадр от {{time}}', {
                                  time: formatObservatoryTime(frame.time, i18n.language)
                              })
                            : formatObservatoryTime(frame.time, i18n.language)}
                    </span>
                )}

                {frame && (
                    // Restarted on every frame: runs across the card until the next one is due
                    <span
                        key={frame.src}
                        className={styles.progress}
                        style={{ animationDuration: `${interval}s` }}
                        aria-hidden={'true'}
                    />
                )}
            </div>

            {lightbox && frame && (
                <PhotoLightbox
                    photos={[{ src: frame.src, width: 1024, height: 768, title: label }]}
                    photoIndex={0}
                    showLightbox={lightbox}
                    onCloseLightBox={() => setLightbox(false)}
                />
            )}
        </Container>
    )
}
