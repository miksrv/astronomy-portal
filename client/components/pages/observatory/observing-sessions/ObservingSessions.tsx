import React from 'react'
import { Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { CardMeta, CardTitle } from '@/components/ui'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { formatObjectName } from '@/utils/strings'
import { TelescopeNight } from '@/utils/telescopeActivity'

import styles from './styles.module.sass'

/** Enough to scroll through a season; the list is capped to the card's height */
const SHOWN_NIGHTS = 24

interface ObservingSessionsProps {
    /** The latest night first */
    nights: TelescopeNight[]
}

/** The telescope's latest nights: what it shot and how much */
export const ObservingSessions: React.FC<ObservingSessionsProps> = ({ nights }) => {
    const { t, i18n } = useTranslation()

    return (
        <Container
            className={styles.observingSessions}
            header={
                <CardTitle icon={'Time'}>
                    {t('components.pages.observatory.observing-sessions.title', 'Последние ночи съёмки')}
                </CardTitle>
            }
            action={
                <CardMeta>
                    {t('components.pages.observatory.observing-sessions.total', 'всего {{count}} ночей', {
                        count: nights.length
                    })}
                </CardMeta>
            }
        >
            {nights.length ? (
                <ul className={styles.sessions}>
                    {nights.slice(0, SHOWN_NIGHTS).map((night) => (
                        <li
                            key={night.date}
                            className={styles.session}
                        >
                            <time
                                className={styles.date}
                                dateTime={night.date}
                            >
                                <b>{Number(night.date.slice(8, 10))}</b>
                                <span>
                                    {formatCalendarDate(night.date, i18n.language, { month: 'short', year: 'numeric' })}
                                </span>
                            </time>
                            <span className={styles.objects}>
                                {night.objects.map((object) => (
                                    <Link
                                        key={object}
                                        href={`/objects/${object}`}
                                        className={styles.tag}
                                    >
                                        {formatObjectName(object)}
                                    </Link>
                                ))}
                            </span>
                            <span className={styles.stats}>
                                <b>{formatExposure(night.exposure, t)}</b>
                                {t('common.frames', '{{count}} кадров', { count: night.frames })}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.empty}>
                    {t('components.pages.observatory.observing-sessions.empty', 'Телескоп ещё не снимал')}
                </p>
            )}
        </Container>
    )
}
