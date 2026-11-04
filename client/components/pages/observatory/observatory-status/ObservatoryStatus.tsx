import React, { useState } from 'react'
import { Button, Container, Message, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel, ApiType } from '@/api'
import { StatusBadge, StatusTone } from '@/components/ui'
import { formatUTCDate } from '@/utils/dates'

import { LiveMeta } from '../live-meta'
import { ObservatoryEvents } from '../observatory-events'

import { CameraCard } from './cards/CameraCard'
import { FilterCard } from './cards/FilterCard'
import { FocuserCard } from './cards/FocuserCard'
import { GenericCard } from './cards/GenericCard'
import { GuiderCard } from './cards/GuiderCard'
import { MountCard } from './cards/MountCard'
import { RoofCard } from './cards/RoofCard'
import { WatchdogCard } from './cards/WatchdogCard'
import { DATA_ROLES } from './constants'
import { RestingKind, RestingPanel } from './resting-panel'
import { SkyMap } from './sky-map'
import { buildDeviceCards, DeviceCardItem, getMinutesAgo } from './utils'

import styles from './styles.module.sass'

interface ObservatoryStatusProps {
    status?: ApiType.Observatory.ResStatus
    loading?: boolean
    /** The request failed and there is nothing to show */
    error?: boolean
    /** The current time; `undefined` until hydrated */
    now?: Date
    /** The log shown under the map; the latest first */
    events?: ApiModel.ObservatoryEvent[]
    eventsLoading?: boolean
    eventsError?: boolean
}

const SCHEDULER_TONES: Record<ApiModel.SchedulerState, StatusTone> = {
    idle: 'neutral',
    running: 'accent',
    paused: 'warning',
    unknown: 'warning'
}

/**
 * What the observatory's agent reports, one card per device (the weather has its own card):
 * a summary bar on top, then the mount, the cameras, the roof and the rest. Every section of
 * the snapshot may be absent (INDI is off, a device is not connected), so a card shows only
 * what is there.
 */
export const ObservatoryStatus: React.FC<ObservatoryStatusProps> = ({
    status,
    loading,
    error,
    now,
    events,
    eventsLoading,
    eventsError
}) => {
    const { t, i18n } = useTranslation()

    const snapshot = status?.snapshot ?? null
    const online = !!status?.online

    // Offline, the last received data stay hidden behind a button: stale cards full of
    // "not connected" read as a breakdown, while the observatory is simply switched off
    const [showLast, setShowLast] = useState(false)

    if (loading) {
        return (
            <Container className={styles.observatoryStatus}>
                <Skeleton className={styles.skeletonSummary} />
                <Skeleton className={styles.skeletonBlock} />
            </Container>
        )
    }

    if (error && !status) {
        return (
            <Container className={styles.observatoryStatus}>
                <Message type={'error'}>
                    {t('components.pages.observatory.status.error', 'Не удалось получить состояние обсерватории')}
                </Message>
            </Container>
        )
    }

    const { scheduler, devices, indi } = snapshot ?? {}
    const indiOffline = indi?.online === false
    const minutesAgo = getMinutesAgo(status?.updatedAt, now)
    const lastSeen = formatUTCDate(status?.updatedAt ?? snapshot?.time, 'D MMMM, HH:mm', i18n.language)

    // At rest: never reported, the computer is off, or it is on with the equipment off — the
    // normal state between clear nights, shown calmly instead of a wall of errors
    const resting: RestingKind | null = !snapshot ? 'never' : !online ? 'offline' : indiOffline ? 'equipment-off' : null
    const showData = !!snapshot && (!resting || (resting === 'offline' && showLast))

    const restingNotes: Record<RestingKind, string> = {
        offline: t('components.pages.observatory.status.rest-offline-title', 'Обсерватория выключена'),
        'equipment-off': t('components.pages.observatory.status.rest-equipment-title', 'Оборудование выключено'),
        never: t('components.pages.observatory.status.rest-never-map', 'Нет данных о телескопе')
    }

    const schedulerLabels: Record<ApiModel.SchedulerState, string> = {
        idle: t('components.pages.observatory.status.scheduler-idle', 'Ожидает'),
        running: t('components.pages.observatory.status.scheduler-running', 'Идёт съёмка'),
        paused: t('components.pages.observatory.status.scheduler-paused', 'Пауза'),
        unknown: t('components.pages.observatory.status.scheduler-unknown', 'Неизвестно')
    }

    const connected = (devices ?? []).filter(({ connected: isConnected }) => isConnected).length
    const cards = snapshot ? buildDeviceCards(snapshot) : []
    const stale = !online

    const renderCard = ({ key, role, name, connected: isConnected, driver, alerts, hasData }: DeviceCardItem) => {
        const common = { name, connected: isConnected, driver, alerts, stale }

        switch (role) {
            case 'mount':
                return hasData && snapshot?.mount ? (
                    <MountCard
                        key={key}
                        mount={snapshot.mount}
                        {...common}
                    />
                ) : null
            case 'camera':
                return hasData && snapshot?.camera ? (
                    <CameraCard
                        key={key}
                        camera={snapshot.camera}
                        {...common}
                    />
                ) : null
            case 'guider':
                return hasData && snapshot?.guider ? (
                    <GuiderCard
                        key={key}
                        guider={snapshot.guider}
                        {...common}
                    />
                ) : null
            case 'filter':
                return hasData && snapshot?.filter ? (
                    <FilterCard
                        key={key}
                        filter={snapshot.filter}
                        {...common}
                    />
                ) : null
            case 'focuser':
                return hasData && snapshot?.focuser ? (
                    <FocuserCard
                        key={key}
                        focuser={snapshot.focuser}
                        {...common}
                    />
                ) : null
            case 'roof':
                return hasData && snapshot?.roof ? (
                    <RoofCard
                        key={key}
                        roof={snapshot.roof}
                        {...common}
                    />
                ) : null
            case 'watchdog':
                return hasData && snapshot?.watchdog ? (
                    <WatchdogCard
                        key={key}
                        watchdog={snapshot.watchdog}
                        {...common}
                    />
                ) : null
            case 'weather':
            case 'other':
                return null
        }
    }

    return (
        <Container className={styles.observatoryStatus}>
            <div className={styles.summary}>
                <LiveMeta
                    online={online}
                    minutesAgo={minutesAgo}
                    quiet={true}
                />
                {/* Profile, scheduler and devices only mean something while the equipment runs */}
                {!resting && (
                    <dl className={styles.summaryFacts}>
                        {indi?.profile && (
                            <div>
                                <dt>{t('components.pages.observatory.status.indi-profile', 'Профиль INDI')}</dt>
                                <dd>{indi.profile}</dd>
                            </div>
                        )}
                        {scheduler && (
                            <div>
                                <dt>{t('components.pages.observatory.status.scheduler-ekos', 'Планировщик Ekos')}</dt>
                                <dd>
                                    <StatusBadge tone={SCHEDULER_TONES[scheduler.state] ?? 'warning'}>
                                        {schedulerLabels[scheduler.state] ?? schedulerLabels.unknown}
                                    </StatusBadge>
                                    {scheduler.job && <span className={styles.job}>{scheduler.job}</span>}
                                </dd>
                            </div>
                        )}
                        {!!devices?.length && (
                            <div>
                                <dt>{t('components.pages.observatory.status.devices', 'Устройства')}</dt>
                                <dd>
                                    {t(
                                        'components.pages.observatory.status.devices-connected',
                                        '{{connected}} из {{total}} подключено',
                                        { connected, total: devices.length }
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>
                )}
            </div>

            {resting === 'offline' && showLast && (
                <Message type={'info'}>
                    <span className={styles.lastNote}>
                        {t('components.pages.observatory.status.last-data', 'Последние полученные данные — {{time}}', {
                            time: lastSeen
                        })}
                        <Button
                            mode={'link'}
                            size={'small'}
                            label={t('components.pages.observatory.status.last-data-hide', 'Скрыть')}
                            onClick={() => setShowLast(false)}
                        />
                    </span>
                </Message>
            )}

            <div className={styles.layout}>
                <div className={styles.cards}>
                    {/* The observatory at rest: one calm plate where the device cards would be */}
                    {!showData && resting && (
                        <RestingPanel
                            kind={resting}
                            lastSeen={resting === 'offline' ? lastSeen : undefined}
                            onShowLast={resting === 'offline' && cards.length ? () => setShowLast(true) : undefined}
                        />
                    )}
                    {/* Running, but no device reports (an empty profile) */}
                    {showData && !cards.length && (
                        <div className={styles.cardsEmpty}>
                            <b>
                                {indiOffline
                                    ? t(
                                          'components.pages.observatory.status.indi-offline',
                                          'Оборудование выключено: сервер INDI не запущен'
                                      )
                                    : t('components.pages.observatory.status.no-devices', 'Устройства не подключены')}
                            </b>
                            <span>
                                {t(
                                    'components.pages.observatory.status.indi-offline-note',
                                    'Карточки оборудования появятся, когда обсерваторию включат. Карта и события — рядом.'
                                )}
                            </span>
                        </div>
                    )}
                    {showData &&
                        cards.map((card) =>
                            card.hasData ? (
                                renderCard(card)
                            ) : (
                                <GenericCard
                                    key={card.key}
                                    role={card.role}
                                    name={card.name}
                                    connected={card.connected}
                                    driver={card.driver}
                                    alerts={card.alerts}
                                    stale={stale}
                                    expectsData={DATA_ROLES.includes(card.role)}
                                />
                            )
                        )}
                </div>

                <aside className={styles.side}>
                    <SkyMap
                        mount={showData ? snapshot?.mount : null}
                        fov={snapshot?.camera?.fov}
                        restingNote={resting && !showData ? restingNotes[resting] : undefined}
                    />
                    <ObservatoryEvents
                        events={events}
                        loading={eventsLoading}
                        error={eventsError}
                        now={now}
                    />
                </aside>
            </div>
        </Container>
    )
}
