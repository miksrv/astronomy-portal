import React from 'react'
import dayjs from 'dayjs'

import { useTranslation } from 'next-i18next/pages'

import { MoonPhaseIcon } from '@/components/common/moon-phase-icon'
import { formatDEC, formatRA } from '@/utils/coordinates'

import { KindIcon } from './kindIcons'
import { azimuthToCompassKey, ObjectInfoData } from './objectInfo'
import { useKindLabels } from './useKindLabels'

import styles from './styles.module.sass'

interface StarMapObjectInfoProps {
    info: ObjectInfoData
    /** The moment the panel was computed for (used for the Moon phase icon) */
    date: Date
}

const formatDegrees = (value: number): string => `${value.toFixed(1)}°`

const StarMapObjectInfo: React.FC<StarMapObjectInfoProps> = ({ info, date }) => {
    const { t } = useTranslation()

    const kindLabels = useKindLabels()

    const rows: Array<{ label: string; value: React.ReactNode }> = []

    // typeof check (not just !== undefined): magnitudes originate in the bundled catalog
    // JSON files, where some entries store the value as a string
    if (typeof info.magnitude === 'number' && Number.isFinite(info.magnitude)) {
        rows.push({
            label: t('components.common.star-map.info.magnitude', 'Зв. величина'),
            value: info.magnitude.toFixed(2)
        })
    }

    // e.g. '182.1° (Ю)' — the compass point makes the direction readable at a glance
    // (the keys already exist for the horizon-mode compass labels)
    const compassLabel = t(
        `components.common.star-map.compass.${azimuthToCompassKey(info.azimuth)}`,
        azimuthToCompassKey(info.azimuth).toUpperCase()
    )

    rows.push(
        { label: 'RA', value: formatRA(info.ra) },
        { label: 'Dec', value: formatDEC(info.dec) },
        {
            label: t('components.common.star-map.info.altitude', 'Высота'),
            value: formatDegrees(info.altitude)
        },
        {
            label: t('components.common.star-map.info.azimuth', 'Азимут'),
            value: `${formatDegrees(info.azimuth)} (${compassLabel})`
        }
    )

    if (info.kind === 'moon') {
        rows.push(
            {
                label: t('components.common.star-map.info.moon-phase', 'Фаза'),
                value: (
                    <>
                        <MoonPhaseIcon date={date} /> {info.moonPhase?.toFixed(2)}
                    </>
                )
            },
            {
                label: t('components.common.star-map.info.illumination', 'Освещённость'),
                value: `${info.moonIllumination?.toFixed(0)}%`
            }
        )

        if (info.moonDistanceKm) {
            rows.push({
                label: t('components.common.star-map.info.distance', 'Расстояние'),
                value: `${Math.round(info.moonDistanceKm).toLocaleString('ru-RU')} ${t(
                    'components.common.star-map.info.km',
                    'км'
                )}`
            })
        }
    }

    if (info.kind === 'planet') {
        if (info.phaseFraction !== undefined) {
            rows.push({
                label: t('components.common.star-map.info.illumination', 'Освещённость'),
                value: `${info.phaseFraction.toFixed(0)}%`
            })
        }

        if (info.distanceAu !== undefined) {
            rows.push({
                label: t('components.common.star-map.info.distance', 'Расстояние'),
                value: `${info.distanceAu.toFixed(2)} ${t('components.common.star-map.info.au', 'а.е.')}`
            })
        }
    }

    if (info.rise) {
        rows.push({
            label: t('components.common.star-map.info.rise', 'Восход'),
            value: dayjs(info.rise).format('HH:mm')
        })
    }

    if (info.set) {
        rows.push({
            label: t('components.common.star-map.info.set', 'Заход'),
            value: dayjs(info.set).format('HH:mm')
        })
    }

    if (info.kind === 'radiant') {
        if (info.activeFrom && info.activeTo) {
            const formatMonthDay = (monthDay: string) => {
                const [month = 1, day = 1] = monthDay.split('-').map(Number)
                return dayjs(new Date(2000, month - 1, day)).format('D MMM')
            }

            rows.push({
                label: t('components.common.star-map.info.active-period', 'Активность'),
                value: `${formatMonthDay(info.activeFrom)} — ${formatMonthDay(info.activeTo)}`
            })

            if (info.peak) {
                rows.push({
                    label: t('components.common.star-map.info.peak', 'Пик'),
                    value: formatMonthDay(info.peak)
                })
            }
        }
    }

    return (
        <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
                <KindIcon
                    kind={info.kind}
                    size={16}
                    className={styles.infoPanelIcon}
                />
                <div>
                    <div className={styles.infoPanelName}>{info.name}</div>
                    <div className={styles.infoPanelKind}>
                        {kindLabels[info.kind]}
                        {info.designation ? ` · ${info.designation}` : ''}
                        {info.kind === 'radiant' &&
                            ` · ${
                                info.isActive
                                    ? t('components.common.star-map.info.active-now', 'активен')
                                    : t('components.common.star-map.info.inactive', 'не активен')
                            }`}
                    </div>
                </div>
            </div>

            <dl className={styles.infoPanelRows}>
                {rows.map((row, index) => (
                    <React.Fragment key={index}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        </div>
    )
}

export default StarMapObjectInfo
