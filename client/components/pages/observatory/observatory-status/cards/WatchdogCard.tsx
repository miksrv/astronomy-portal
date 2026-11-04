import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'
import { getHumanTimeFromSec } from '@/utils/dates'

import { DeviceCard, Fact, Facts } from '../device-card'
import { isNumber } from '../utils'

interface WatchdogCardProps {
    watchdog: ApiModel.ObservatoryWatchdog
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts?: string[]
    stale?: boolean
}

/** The watchdog: is it armed, what trips it and what it shuts down, in order */
export const WatchdogCard: React.FC<WatchdogCardProps> = ({ watchdog, name, connected, driver, alerts, stale }) => {
    const { t } = useTranslation()

    // A value the front end does not know yet is shown as it is
    const triggerLabels: Record<string, string> = {
        client: t('components.pages.observatory.status.trigger-client', 'нет связи с клиентом'),
        weather: t('components.pages.observatory.status.trigger-weather', 'опасная погода')
    }

    const shutdownLabels: Record<string, string> = {
        mount: t('components.pages.observatory.status.shutdown-mount', 'парковка монтировки'),
        dome: t('components.pages.observatory.status.shutdown-dome', 'закрытие крыши'),
        script: t('components.pages.observatory.status.shutdown-script', 'аварийный скрипт')
    }

    return (
        <DeviceCard
            deviceRole={'watchdog'}
            name={name}
            connected={connected}
            driver={driver}
            alerts={alerts}
            stale={stale}
            state={
                <StatusBadge tone={watchdog.armed ? 'positive' : 'warning'}>
                    {watchdog.armed
                        ? t('components.pages.observatory.status.watchdog-armed', 'Включён')
                        : t('components.pages.observatory.status.watchdog-off', 'Выключен')}
                </StatusBadge>
            }
        >
            <Facts columns={3}>
                {isNumber(watchdog.heartbeat) && (
                    <Fact
                        label={t('components.pages.observatory.status.watchdog-heartbeat', 'Проверка связи')}
                        note={t('components.pages.observatory.status.watchdog-heartbeat-note', 'сработает без сигнала')}
                    >
                        {getHumanTimeFromSec(watchdog.heartbeat, t)}
                    </Fact>
                )}

                {!!watchdog.triggers.length && (
                    <Fact label={t('components.pages.observatory.status.watchdog-triggers', 'Срабатывает при')}>
                        {watchdog.triggers.map((item) => triggerLabels[item] ?? item).join(', ')}
                    </Fact>
                )}

                {!!watchdog.shutdown.length && (
                    <Fact label={t('components.pages.observatory.status.watchdog-shutdown', 'Порядок отключения')}>
                        {watchdog.shutdown
                            .map((item, index) => `${index + 1}. ${shutdownLabels[item] ?? item}`)
                            .join(' → ')}
                    </Fact>
                )}
            </Facts>
        </DeviceCard>
    )
}
