import classNames from 'classnames'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import Lightbox from 'react-image-lightbox'
import { Dimmer, Message, Progress } from 'semantic-ui-react'

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
        <div
            className={classNames(styles.cameraSection, 'box')}
            data-testid={'camera-section'}
        >
            {cameraURL && lightbox && (
                <Lightbox
                    data-testid={'lightbox'}
                    mainSrc={cameraSrc}
                    onCloseRequest={() => setLightbox(false)}
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
                    <Progress
                        size={'tiny'}
                        className={styles.progress}
                        data-testid={'progress-bar'}
                        percent={Math.round((seconds / timeoutInt) * 100)}
                        success
                    />
                </>
            ) : (
                <Dimmer active>
                    <Message
                        error
                        icon={'photo'}
                        header={'Камера не доступна'}
                        content={'Изображение камеры не доступно'}
                    />
                </Dimmer>
            )}
        </div>
    )
}

export default Camera
