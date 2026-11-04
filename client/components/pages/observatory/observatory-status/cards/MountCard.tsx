import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge, StatusTone } from '@/components/ui'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'

import { DeviceCard, Fact, Facts } from '../device-card'
import { formatSiderealTime, getMountState, isNumber, MountState } from '../utils'

import { useNumber } from './useNumber'

interface MountCardProps {
    mount: ApiModel.ObservatoryMount
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

const MOUNT_TONES: Record<MountState, StatusTone> = {
    slewing: 'accent',
    parked: 'neutral',
    tracking: 'positive',
    idle: 'warning'
}

/** The mount: what it is doing, where it points and a small sky map of the same */
export const MountCard: React.FC<MountCardProps> = ({ mount, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()
    const number = useNumber()

    const state = getMountState(mount)

    const stateLabels: Record<MountState, string> = {
        slewing: t('components.pages.observatory.status.mount-slewing', 'Наведение'),
        parked: t('components.pages.observatory.status.mount-parked', 'Припаркована'),
        tracking: t('components.pages.observatory.status.mount-tracking', 'Ведение'),
        idle: t('components.pages.observatory.status.mount-idle', 'Стоит')
    }

    const trackLabels: Record<ApiModel.TrackMode, string> = {
        sidereal: t('components.pages.observatory.status.track-sidereal', 'звёздная'),
        solar: t('components.pages.observatory.status.track-solar', 'солнечная'),
        lunar: t('components.pages.observatory.status.track-lunar', 'лунная'),
        custom: t('components.pages.observatory.status.track-custom', 'пользовательская')
    }

    const pierLabels = {
        east: t('components.pages.observatory.status.pier-east', 'восточная'),
        west: t('components.pages.observatory.status.pier-west', 'западная')
    }

    const lst = formatSiderealTime(mount.lst)

    const { target } = mount

    return (
        <DeviceCard
            deviceRole={'mount'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={<StatusBadge tone={MOUNT_TONES[state]}>{stateLabels[state]}</StatusBadge>}
        >
            <Facts columns={3}>
                <Fact label={t('components.pages.observatory.status.coordinates', 'Координаты (J2000)')}>
                    {`${formatRAShort(mount.raJ2000)} ${formatDECShort(mount.decJ2000)}`}
                </Fact>

                <Fact label={t('components.pages.observatory.status.alt-az-label', 'Высота / азимут')}>
                    {t('components.pages.observatory.status.alt-az-value', '{{alt}}° / {{az}}°', {
                        alt: number(mount.alt),
                        az: number(mount.az)
                    })}
                </Fact>

                {mount.pierSide && (
                    <Fact label={t('components.pages.observatory.status.pier-side', 'Сторона пирса')}>
                        {pierLabels[mount.pierSide]}
                    </Fact>
                )}

                {mount.trackMode && (
                    <Fact label={t('components.pages.observatory.status.track-mode', 'Скорость ведения')}>
                        {trackLabels[mount.trackMode] ?? mount.trackMode}
                    </Fact>
                )}

                {lst && <Fact label={t('components.pages.observatory.status.lst', 'Звёздное время')}>{lst}</Fact>}

                {target && isNumber(target.ra) && isNumber(target.dec) && (
                    <Fact
                        label={t('components.pages.observatory.status.goto-target', 'Цель (последний GOTO)')}
                        note={t('components.pages.observatory.status.target-note', 'J2000')}
                    >
                        {`${formatRAShort(target.ra)} ${formatDECShort(target.dec)}`}
                    </Fact>
                )}
            </Facts>
        </DeviceCard>
    )
}
