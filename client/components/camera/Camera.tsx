import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Container, Message } from 'simple-react-ui-kit'

import PhotoLightbox from '@/components/photo-lightbox'

import styles from './styles.module.sass'

interface CameraProps {
    cameraURL?: string
    interval?: number
}

const DEFAULT_INTERVAL = 5

const Camera: React.FC<CameraProps> = ({ cameraURL, interval }) => {
    const timeoutInt = interval || DEFAULT_INTERVAL

    const [cameraSrc, setCameraSrc] = useState<string>(cameraURL || '')
    const [seconds, setSeconds] = useState<number>(0)
    const [lightbox, setLightbox] = useState<boolean>(false)

    useEffect(() => {
        if (cameraURL) {
            const crypto = window.crypto
            let array = new Uint32Array(1)

            const interval = setInterval(() => {
                if (seconds < timeoutInt) {
                    setSeconds((seconds) => seconds + 1)
                } else {
                    setCameraSrc(
                        cameraURL + '?r=' + crypto.getRandomValues(array)
                    )
                    setSeconds(0)
                }
            }, 1000)

            return () => clearInterval(interval)
        }
    })

    return (
        <Container className={styles.cameraSection}>
            {cameraURL && lightbox && (
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
            {cameraURL ? (
                <>
                    <span
                        className={styles.lightboxTrigger}
                        role={'button'}
                        tabIndex={0}
                        onKeyUp={() => {}}
                        onClick={() => setLightbox(true)}
                    >
                        <Image
                            className={styles.photoImage}
                            src={cameraSrc}
                            alt={'Изображение с камеры обсерватории'}
                            height={428}
                            width={400}
                        />
                    </span>
                    {/*<Progress*/}
                    {/*    size={'tiny'}*/}
                    {/*    className={styles.progress}*/}
                    {/*    data-testid={'progress-bar'}*/}
                    {/*    percent={Math.round((seconds / timeoutInt) * 100)}*/}
                    {/*    success*/}
                    {/*/>*/}
                </>
            ) : (
                <Message
                    type={'error'}
                    title={'Камера не доступна'}
                >
                    {'Изображение камеры не доступно'}
                </Message>
            )}
        </Container>
    )
}

export default Camera
