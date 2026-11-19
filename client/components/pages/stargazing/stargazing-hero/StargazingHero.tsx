import React from 'react'
import { Button, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { StargazingStats } from '@/components/common/stargazing-stats/StargazingStats'
import heroPhoto from '@/public/photos/howto-2.jpeg'
import { formatUTCDate, getSecondsUntilUTCDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface StargazingHeroProps {
    /** The upcoming event, if one is announced: the primary action books it */
    event?: ApiModel.Event
}

/**
 * The first screen of /stargazing: a night photo of a real event under a big two-line title,
 * a one-line promise, one primary action that fits the moment and the numbers of the project
 */
export const StargazingHero: React.FC<StargazingHeroProps> = ({ event }) => {
    const { t, i18n } = useTranslation()
    const dispatch = useAppDispatch()
    const user = useAppSelector((state) => state.auth.user)

    const eventDate = formatUTCDate(event?.date?.date, 'D MMMM', i18n.language)

    // "Записаться" only while a seat can actually be booked (the rules of useEventBookingStatus);
    // otherwise (no booking, not open yet, closed, sold out, already booked) the neutral label
    const canBook =
        !!event &&
        event.requiresRegistration !== false &&
        event.availableTickets !== 0 &&
        !event.registered &&
        (getSecondsUntilUTCDate(event.registrationStart?.date) || 0) < 0 &&
        (getSecondsUntilUTCDate(event.registrationEnd?.date) || 0) > 0

    return (
        <section className={styles.hero}>
            <div
                className={styles.backdrop}
                aria-hidden={'true'}
            >
                <Image
                    src={heroPhoto}
                    alt={''}
                    fill
                    preload
                    fetchPriority={'high'}
                    placeholder={'blur'}
                    sizes={'100vw'}
                    className={styles.backdropImage}
                />
            </div>

            <div className={styles.body}>
                <p className={styles.kicker}>
                    {t('pages.stargazing.hero-kicker', 'Оренбург · Наблюдение за звёздами')}
                </p>

                <h1 className={styles.title}>
                    {t('pages.stargazing.hero-title-line1', 'Астровыезды')}{' '}
                    <em>{t('pages.stargazing.hero-title-accent', 'под тёмным небом')}</em>
                </h1>

                <p className={styles.lead}>
                    {t(
                        'pages.stargazing.hero-lead',
                        'Вечер за городом: лекция под открытым небом, прогулка по созвездиям и кольца Сатурна в окуляре телескопа.'
                    )}
                </p>

                <div className={styles.actions}>
                    {event ? (
                        <Button
                            mode={'primary'}
                            size={'large'}
                            label={
                                canBook
                                    ? t('pages.stargazing.hero-cta-book', 'Записаться на {{date}}', {
                                          date: eventDate
                                      })
                                    : t('pages.stargazing.hero-cta-upcoming', 'Ближайший выезд {{date}}', {
                                          date: eventDate
                                      })
                            }
                            link={'#upcoming'}
                        />
                    ) : !user?.id ? (
                        <Button
                            mode={'primary'}
                            size={'large'}
                            icon={'Bell'}
                            label={t('pages.stargazing.hero-cta-notify', 'Узнать о следующем выезде')}
                            onClick={() => dispatch(openAuthDialog())}
                        />
                    ) : (
                        <Button
                            mode={'primary'}
                            size={'large'}
                            label={t('pages.stargazing.hero-cta-program', 'Как проходит вечер')}
                            link={'#program'}
                        />
                    )}

                    <a
                        href={'https://t.me/look_at_stars'}
                        className={styles.telegram}
                        rel={'nofollow noopener'}
                        target={'_blank'}
                    >
                        <Icon name={'Telegram'} />
                        {t('pages.stargazing.hero-cta-announcements', 'Анонсы в Telegram')}
                    </a>
                </div>
            </div>

            <StargazingStats
                strip
                className={styles.stats}
            />
        </section>
    )
}
