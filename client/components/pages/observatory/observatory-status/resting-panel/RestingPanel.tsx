import React from 'react'
import { Button, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export type RestingKind = 'offline' | 'equipment-off' | 'never'

interface RestingPanelProps {
    kind: RestingKind
    /** When the observatory last reported, already formatted ("3 ноября, 04:47") */
    lastSeen?: string
    /** Offer the last received data (offline only, when there is some) */
    onShowLast?: () => void
}

/**
 * The observatory at rest: the computer or the equipment is switched off, which is how it waits
 * for a clear night. Said calmly, in place of the device cards, instead of a wall of errors.
 */
export const RestingPanel: React.FC<RestingPanelProps> = ({ kind, lastSeen, onShowLast }) => {
    const { t } = useTranslation()

    const title =
        kind === 'offline'
            ? t('components.pages.observatory.status.rest-offline-title', 'Обсерватория выключена')
            : kind === 'equipment-off'
              ? t('components.pages.observatory.status.rest-equipment-title', 'Оборудование выключено')
              : t('components.pages.observatory.status.rest-never-title', 'Обсерватория ещё не выходила на связь')

    const text =
        kind === 'offline'
            ? t(
                  'components.pages.observatory.status.rest-offline-text',
                  'Компьютер обсерватории сейчас не на связи. Так бывает, когда обсерватория ждёт погоды: её включают только на время съёмки ясными ночами.'
              )
            : kind === 'equipment-off'
              ? t(
                    'components.pages.observatory.status.rest-equipment-text',
                    'Компьютер обсерватории на связи, а телескоп и камеры отдыхают: оборудование включают только на время съёмки ясными ночами.'
                )
              : t(
                    'components.pages.observatory.status.rest-never-text',
                    'Состояние телескопа, камер и крыши появится здесь, как только обсерватория впервые передаст данные.'
                )

    return (
        <div className={styles.restingPanel}>
            <span
                className={styles.icon}
                aria-hidden={'true'}
            >
                <Icon name={'Moon'} />
            </span>
            <div className={styles.body}>
                <b className={styles.title}>{title}</b>
                <p className={styles.text}>{text}</p>
                {lastSeen && (
                    <p className={styles.meta}>
                        {t('components.pages.observatory.status.rest-last-seen', 'Последняя связь: {{time}}', {
                            time: lastSeen
                        })}
                    </p>
                )}
                {onShowLast && (
                    <Button
                        mode={'secondary'}
                        size={'small'}
                        className={styles.action}
                        label={t(
                            'components.pages.observatory.status.rest-show-last',
                            'Показать последние полученные данные'
                        )}
                        onClick={onShowLast}
                    />
                )}
            </div>
        </div>
    )
}
