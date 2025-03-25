import React, { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { Container, Message, Spinner } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

import PhotoLightbox from '@/components/photo-lightbox'

interface CameraProps {
    cameraURL?: string
    interval?: number
}

const DEFAULT_INTERVAL = 5000

const Camera: React.FC<CameraProps> = ({ cameraURL, interval }) => {
    const { t } = useTranslation()

    const refreshInterval = interval ? interval * 1000 : DEFAULT_INTERVAL

    const [cameraSrc, setCameraSrc] = useState<string>(cameraURL || '')
    const [lightbox, setLightbox] = useState<boolean>(false)

    useEffect(() => {
        if (!cameraURL) {
            return
        }

        const updateImage = () => {
            setCameraSrc(`${cameraURL}?r=${Date.now()}`)
        }

        updateImage()
        const intervalId = setInterval(updateImage, refreshInterval)

        return () => clearInterval(intervalId)
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
                        className={styles.lightboxTrigger}
                        tabIndex={0}
                        onClick={() => setLightbox(true)}
                    >
                        <Spinner />
                        <img
                            className={styles.photoImage}
                            src={cameraSrc}
                            alt={t('image-from-observatory-camera')}
                        />
                    </button>
                </>
            ) : (
                <Message
                    type={'error'}
                    title={t('camera-not-available')}
                >
                    {t('camera-image-not-available')}
                </Message>
            )}
        </Container>
    )
}

export default Camera
