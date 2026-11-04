import React, { useState } from 'react'
import { Button, cn, Icon, Message, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { CardMeta, CardTitle } from '@/components/ui'
import { formatUTCDate } from '@/utils/dates'

import { INITIAL_COUNT, MORE_COUNT } from './constants'
import { getEventDevice, getEventMeta, groupEventsByDay } from './utils'

import styles from './styles.module.sass'

interface ObservatoryEventsProps {
    /** The latest first */
    events?: ApiModel.ObservatoryEvent[]
    loading?: boolean
    error?: boolean
    /** The current time; `undefined` until hydrated */
    now?: Date
}

/** What happened at the observatory lately: the roof, the mount, the weather, the shooting; by day. Lives inside the status block. */
export const ObservatoryEvents: React.FC<ObservatoryEventsProps> = ({ events, loading, error, now }) => {
    const { t, i18n } = useTranslation()

    const [shown, setShown] = useState(INITIAL_COUNT)

    // A type the front end does not know yet (a newer agent) is shown as it is, not dropped
    const labels: Record<string, string> = {
        indi_online: t('components.pages.observatory.events.indi-online', 'Сервер INDI запущен'),
        indi_offline: t('components.pages.observatory.events.indi-offline', 'Сервер INDI остановлен'),
        roof_opened: t('components.pages.observatory.events.roof-opened', 'Крыша открыта'),
        roof_closed: t('components.pages.observatory.events.roof-closed', 'Крыша закрыта'),
        mount_parked: t('components.pages.observatory.events.mount-parked', 'Монтировка припаркована'),
        mount_unparked: t('components.pages.observatory.events.mount-unparked', 'Монтировка выведена из парковки'),
        weather_alert: t('components.pages.observatory.events.weather-alert', 'Погода: опасные условия'),
        weather_ok: t('components.pages.observatory.events.weather-ok', 'Погода в норме'),
        job_started: t('components.pages.observatory.events.job-started', 'Началась съёмка'),
        job_finished: t('components.pages.observatory.events.job-finished', 'Съёмка завершена'),
        agent_started: t('components.pages.observatory.events.agent-started', 'Запущен агент обсерватории')
    }

    // Today's events need no heading: only older days are named
    const dayLabel = (kind: 'yesterday' | 'date', time: string): string =>
        kind === 'yesterday'
            ? t('components.pages.observatory.events.yesterday', 'Вчера')
            : (formatUTCDate(time, 'D MMMM', i18n.language) ?? '')

    const visible = events?.slice(0, shown) ?? []
    const days = groupEventsByDay(visible, now)
    const rest = (events?.length ?? 0) - visible.length

    return (
        <section className={styles.observatoryEvents}>
            <header className={styles.head}>
                <CardTitle
                    as={'h3'}
                    icon={'Feed'}
                >
                    {t('components.pages.observatory.events.title', 'Недавние события')}
                </CardTitle>
                <CardMeta>{'GMT+5'}</CardMeta>
            </header>
            {loading ? (
                <Skeleton className={styles.skeleton} />
            ) : error && !events ? (
                <Message type={'error'}>
                    {t('components.pages.observatory.events.error', 'Не удалось загрузить события')}
                </Message>
            ) : !events?.length ? (
                <p className={styles.empty}>{t('components.pages.observatory.events.empty', 'Событий пока нет')}</p>
            ) : (
                <div className={styles.list}>
                    {days.map(({ key, kind, time, events: dayEvents }) => (
                        <section
                            key={key}
                            className={styles.day}
                        >
                            {kind !== 'today' && <h3 className={styles.dayTitle}>{dayLabel(kind, time)}</h3>}
                            <ol className={styles.events}>
                                {dayEvents.map((event) => {
                                    const { icon, tone } = getEventMeta(event.type)
                                    const device = getEventDevice(event)

                                    return (
                                        <li
                                            key={event.id}
                                            className={cn(styles.event, styles[tone])}
                                        >
                                            <span
                                                className={styles.icon}
                                                aria-hidden={'true'}
                                            >
                                                <Icon name={icon} />
                                            </span>
                                            <span className={styles.text}>
                                                {labels[event.type] ?? event.type}
                                                {device && <small>{device}</small>}
                                            </span>
                                            <time
                                                dateTime={event.time}
                                                className={styles.time}
                                            >
                                                {formatUTCDate(event.time, 'HH:mm', i18n.language)}
                                            </time>
                                        </li>
                                    )
                                })}
                            </ol>
                        </section>
                    ))}

                    {/* At the end of the list */}
                    {rest > 0 && (
                        <Button
                            mode={'secondary'}
                            size={'small'}
                            stretched={true}
                            className={styles.more}
                            label={t('components.pages.observatory.events.show-more', 'Показать ещё')}
                            onClick={() => setShown((count) => count + MORE_COUNT)}
                        />
                    )}
                </div>
            )}
        </section>
    )
}
