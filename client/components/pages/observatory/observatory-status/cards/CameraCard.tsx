import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'

import { FRAME_TYPE_LABELS } from '../constants'
import { DeviceCard, Fact, Facts, Meter } from '../device-card'
import { formatCountdown, formatFov, formatOptics, formatSize, isNumber } from '../utils'

import { useNumber } from './useNumber'

interface CameraCardProps {
    camera: ApiModel.ObservatoryCamera
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

/** The main camera: the exposure under way, the cooling and what the frame is set to */
export const CameraCard: React.FC<CameraCardProps> = ({ camera, name, connected, driver, alerts, stale }) => {
    const { t, i18n } = useTranslation()
    const number = useNumber()

    const exposureLeft = isNumber(camera.exposureLeft) ? Math.round(camera.exposureLeft) : undefined
    const power = isNumber(camera.coolerPower) ? Math.round(camera.coolerPower) : undefined

    const state = camera.exposing ? (
        <StatusBadge
            tone={'accent'}
            dot={true}
        >
            {exposureLeft !== undefined
                ? t('components.pages.observatory.status.exposing-left', 'Съёмка · {{time}}', {
                      time: formatCountdown(exposureLeft)
                  })
                : t('components.pages.observatory.status.exposing', 'Идёт экспозиция')}
        </StatusBadge>
    ) : (
        <StatusBadge tone={'neutral'}>{t('components.pages.observatory.status.camera-idle', 'Не снимает')}</StatusBadge>
    )

    return (
        <DeviceCard
            deviceRole={'camera'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={state}
        >
            <Facts>
                {camera.frameType && (
                    <Fact label={t('components.pages.observatory.status.frame-type', 'Тип кадра')}>
                        {FRAME_TYPE_LABELS[camera.frameType] ?? camera.frameType}
                    </Fact>
                )}

                {isNumber(camera.temperature) && (
                    <Fact label={t('components.pages.observatory.status.temperature', 'Температура')}>
                        {`${number(camera.temperature)}℃`}
                    </Fact>
                )}

                {camera.coolerOn != null && (
                    <Fact label={t('components.pages.observatory.status.cooler', 'Охлаждение')}>
                        {camera.coolerOn
                            ? power !== undefined
                                ? t('components.pages.observatory.status.cooler-on-power', 'включено, {{power}}%', {
                                      power
                                  })
                                : t('components.pages.observatory.status.cooler-state-on', 'включено')
                            : t('components.pages.observatory.status.cooler-state-off', 'выключено')}
                        {camera.coolerOn && power !== undefined && (
                            <Meter
                                percent={power}
                                tone={power > 90 ? 'warning' : 'accent'}
                                label={t(
                                    'components.pages.observatory.status.cooler-power-label',
                                    'Мощность охлаждения'
                                )}
                            />
                        )}
                    </Fact>
                )}

                {(isNumber(camera.gain) || isNumber(camera.offset)) && (
                    <Fact label={t('components.pages.observatory.status.gain-offset', 'Gain / Offset')}>
                        {`${isNumber(camera.gain) ? camera.gain : '—'} / ${isNumber(camera.offset) ? camera.offset : '—'}`}
                    </Fact>
                )}

                <Fact label={t('components.pages.observatory.status.binning', 'Биннинг')}>
                    {`${camera.binning}×${camera.binning}`}
                </Fact>

                {camera.sensor && (
                    <Fact label={t('components.pages.observatory.status.sensor', 'Матрица')}>
                        {t('components.pages.observatory.status.sensor-size', '{{size}} px', {
                            size: formatSize(camera.sensor.width, camera.sensor.height)
                        })}
                    </Fact>
                )}

                {(isNumber(camera.focalLength) || isNumber(camera.aperture)) && (
                    <Fact label={t('components.pages.observatory.status.optics', 'Оптика')}>
                        {formatOptics(camera.focalLength, camera.aperture)}
                    </Fact>
                )}

                {camera.fov && (
                    <Fact label={t('components.pages.observatory.status.fov', 'Поле зрения')}>
                        {formatFov(camera.fov, i18n.language)}
                    </Fact>
                )}
            </Facts>
        </DeviceCard>
    )
}
