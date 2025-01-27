import React, { useEffect, useState } from 'react'
import { Container, Message, Spinner } from 'simple-react-ui-kit'

import PhotoLightbox from '@/components/photo-lightbox'

import styles from './styles.module.sass'

interface CameraProps {
    cameraURL?: string
    interval?: number
}

const DEFAULT_INTERVAL = 5000

const Camera: React.FC<CameraProps> = ({ cameraURL, interval }) => {
    const refreshInterval = interval ? interval * 1000 : DEFAULT_INTERVAL

    const [cameraSrc, setCameraSrc] = useState<string>(cameraURL || '')
    const [lightbox, setLightbox] = useState<boolean>(false)

    useEffect(() => {
        if (!cameraURL) return

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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className={styles.photoImage}
                            src={cameraSrc}
                            alt='Изображение с камеры обсерватории'
                        />
                    </button>
                </>
            ) : (
                <Message
                    type='error'
                    title='Камера не доступна'
                >
                    Изображение камеры не доступно
                </Message>
            )}
        </Container>
    )
}

export default Camera
