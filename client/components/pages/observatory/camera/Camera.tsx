import React, { useEffect, useState } from 'react'
import { Container, Message, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { PhotoLightbox } from '@/components/common'

import styles from './styles.module.sass'

interface CameraProps {
    cameraURL?: string
    interval?: number
}

const DEFAULT_INTERVAL = 5000

export const Camera: React.FC<CameraProps> = ({ cameraURL, interval }) => {
    const { t } = useTranslation()

    const refreshInterval = interval ? interval * 1000 : DEFAULT_INTERVAL

    // The last frame that loaded; empty until the first one arrives
    const [cameraSrc, setCameraSrc] = useState<string>('')
    const [lightbox, setLightbox] = useState<boolean>(false)
    // 'loading' until the first frame arrives; a failed refresh keeps the last good frame
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

    useEffect(() => {
        if (!cameraURL) {
            return
        }

        let cancelled = false

        // Each frame is loaded off-screen and shown only once it has arrived, so a
        // failed refresh never replaces the picture on screen with a broken image
        const updateImage = () => {
            const src = `${cameraURL}?r=${Date.now()}`
            const frame = new Image()

            frame.onload = () => {
                if (!cancelled) {
                    setCameraSrc(src)
                    setStatus('ready')
                }
            }
            frame.onerror = () => {
                if (!cancelled) {
                    setStatus('error')
                }
            }
            frame.src = src
        }

        updateImage()
        const intervalId = setInterval(updateImage, refreshInterval)

        return () => {
            cancelled = true
            clearInterval(intervalId)
        }
    }, [cameraURL, refreshInterval])

    return (
        <Container className={styles.cameraSection}>
            {cameraURL ? (
                <>
                    {lightbox && (
                        <PhotoLightbox
                            photos={[
                                {
                                    src: cameraSrc,
                                    width: 1024,
                                    height: 768,
                                    title: ''
                                }
                            ]}
                            photoIndex={0}
                            showLightbox={lightbox}
                            onCloseLightBox={() => setLightbox(false)}
                        />
                    )}
                    <button
                        type={'button'}
                        className={styles.lightboxTrigger}
                        disabled={!cameraSrc}
                        onClick={() => setLightbox(true)}
                    >
                        {status === 'loading' && <Spinner className={styles.spinner} />}
                        {cameraSrc && (
                            // eslint-disable-next-line next/no-img-element
                            <img
                                className={styles.photoImage}
                                src={cameraSrc}
                                alt={t(
                                    'components.pages.observatory.camera.image-from-observatory-camera',
                                    'Изображение с камеры обсерватории'
                                )}
                            />
                        )}
                    </button>
                    {status === 'error' && (
                        <Message
                            type={'error'}
                            className={styles.error}
                        >
                            {t(
                                'components.pages.observatory.camera.camera-image-not-available',
                                'Изображение с камеры недоступно'
                            )}
                        </Message>
                    )}
                </>
            ) : (
                <Message
                    type={'error'}
                    title={t('components.pages.observatory.camera.camera-not-available', 'Камера недоступна')}
                >
                    {t(
                        'components.pages.observatory.camera.camera-image-not-available',
                        'Изображение с камеры недоступно'
                    )}
                </Message>
            )}
        </Container>
    )
}
