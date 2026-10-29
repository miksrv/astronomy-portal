import React from 'react'
import { Button, Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { GeoNudgeStatus } from './useGeoNudge'

import styles from './styles.module.sass'

interface StarMapGeoNudgeProps {
    status: GeoNudgeStatus
    /** True while the browser is resolving the position */
    geolocationPending: boolean
    onLocate: () => void
    onDismiss: () => void
}

/**
 * In-map card shown on the first horizon-mode visit while the sky is still the
 * observatory's fallback: explains what "locate me" does before the browser's own
 * permission prompt appears (Business Rule 3), and tells the visitor whose sky they are
 * looking at when geolocation fails.
 */
const StarMapGeoNudge: React.FC<StarMapGeoNudgeProps> = ({ status, geolocationPending, onLocate, onDismiss }) => {
    const { t } = useTranslation()

    if (status === 'hidden') {
        return null
    }

    return (
        <Container
            className={styles.geoNudge}
            role={'status'}
        >
            {status === 'failed' ? (
                <>
                    <span className={styles.geoNudgeText}>
                        {t(
                            'components.common.star-map.geo-nudge.failed',
                            'Не удалось определить местоположение, показано небо над обсерваторией'
                        )}
                    </span>
                    <Button
                        size={'small'}
                        mode={'secondary'}
                        onClick={onDismiss}
                    >
                        {t('components.common.star-map.geo-nudge.ok', 'Ок')}
                    </Button>
                </>
            ) : (
                <>
                    <span className={styles.geoNudgeText}>
                        {t('components.common.star-map.geo-nudge.question', 'Показать небо над вами?')}
                    </span>
                    <div className={styles.geoNudgeActions}>
                        <Button
                            size={'small'}
                            mode={'primary'}
                            icon={'Position'}
                            loading={geolocationPending}
                            onClick={onLocate}
                        >
                            {t('components.common.star-map.geo-nudge.locate', 'Определить местоположение')}
                        </Button>
                        <Button
                            size={'small'}
                            mode={'secondary'}
                            disabled={geolocationPending}
                            onClick={onDismiss}
                        >
                            {t('components.common.star-map.geo-nudge.later', 'Позже')}
                        </Button>
                    </div>
                </>
            )}
        </Container>
    )
}

export default StarMapGeoNudge
