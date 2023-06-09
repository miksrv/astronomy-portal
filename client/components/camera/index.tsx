import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import Lightbox from 'react-image-lightbox'
import { Dimmer, Message, Progress } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TCameraProps = {
    cameraURL: string
    interval?: number
}

const DEFAULT_INTERVAL = 15

const Camera: React.FC<TCameraProps> = (props) => {
    const { cameraURL, interval } = props

    const timeoutInt = interval || DEFAULT_INTERVAL

    const [cameraSrc, setCameraSrc] = useState<string>(cameraURL)
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
        <div className={classNames(styles.cameraSection, 'box')}>
            {cameraURL && lightbox && (
                <Lightbox
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
                        <img
                            className={styles.photoImage}
                            src={cameraSrc}
                            alt={'Изображение с камеры обсерватории'}
                        />
                    </span>
                    <Progress
                        className={styles.progress}
                        percent={Math.round((seconds / timeoutInt) * 100)}
                        success
                        size={'tiny'}
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
