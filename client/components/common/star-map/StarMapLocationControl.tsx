import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { FastForwardIcon, PauseIcon, RewindIcon, SlowDownIcon, SpeedUpIcon } from '@/components/icons'
import { DateTimeInput } from '@/components/ui/date-time-input'

import { MOBILE_MAX_WIDTH, TIME_FLOW_DISPLAY_INTERVAL_MS } from './constants'
import { findTonightMoment } from './nightPreset'
import { formatTimeRate, TIME_RATE_MAX, TIME_RATE_MIN } from './timeFlow'
import { dateToWallClock, ResolvedTimeZone, wallClockToDate } from './timezone'
import { useLiveClock } from './useLiveClock'

import styles from './styles.module.sass'

interface StarMapLocationControlProps {
    geopos: [number, number]
    date: Date | null
    timeZone: ResolvedTimeZone | null
    /** True while the timezone of the current geopos is still being resolved */
    timeZonePending: boolean
    geolocationPending: boolean
    /** Seconds of sky per real second; `1` is real time (see timeFlow.ts) */
    timeRate: number
    /** The instant the map is currently drawn for — polled while the flow runs */
    resolveDate: () => Date
    onGeoposChange: (geopos: [number, number]) => void
    onDateChange: (date: Date | null) => void
    /** Multiply the flow rate by the given factor (the ÷8 / ÷2 / ×2 / ×8 buttons) */
    onTimeRateChange: (factor: number) => void
    /** Freeze the sky at the moment the flow reached and go back to real time */
    onTimeFlowPause: () => void
    /** Lazily resolves (and caches) the timezone of the current geopos */
    onEnsureTimeZone: () => Promise<ResolvedTimeZone | null>
    onRequestBrowserLocation: () => Promise<[number, number] | null>
}

const clampLatitude = (value: number): number => Math.max(-90, Math.min(90, value))
const clampLongitude = (value: number): number => Math.max(-180, Math.min(180, value))

const StarMapLocationControl: React.FC<StarMapLocationControlProps> = ({
    geopos,
    date,
    timeZone,
    timeZonePending,
    geolocationPending,
    timeRate,
    resolveDate,
    onGeoposChange,
    onDateChange,
    onTimeRateChange,
    onTimeFlowPause,
    onEnsureTimeZone,
    onRequestBrowserLocation
}) => {
    const { t, i18n } = useTranslation()

    // Local drafts so typing doesn't rebuild the map on every keystroke — commit on blur/Enter
    const [latDraft, setLatDraft] = useState<string>(String(geopos[0]))
    const [lonDraft, setLonDraft] = useState<string>(String(geopos[1]))
    const [dateDraft, setDateDraft] = useState<string>('')

    // The date popout has to escape the desktop sidebar's own scroll box, which clips it —
    // that is what `portal` (fixed positioning) is for. On the mobile bottom sheet the same
    // portal would open below the fold with no way to reach it, while the sheet's own
    // scrolling reaches an in-flow popout just fine, so it is desktop-only.
    const [isDesktop, setIsDesktop] = useState<boolean>(false)

    useEffect(() => {
        const query = window.matchMedia(`(min-width: ${MOBILE_MAX_WIDTH + 1}px)`)
        const sync = () => setIsDesktop(query.matches)

        sync()
        query.addEventListener('change', sync)

        return () => query.removeEventListener('change', sync)
    }, [])

    useEffect(() => {
        setLatDraft(String(geopos[0]))
        setLonDraft(String(geopos[1]))
    }, [geopos])

    // With no moment picked the map is live, and the field says so by standing at the
    // place's current time rather than empty. While the flow runs the same field follows
    // the simulated clock — polled once a second, never per animation frame, so the panel
    // stays out of the redraw loop (the canvas is driven straight from useCelestialDisplay).
    const flowing = timeRate > TIME_RATE_MIN
    const [now, setNow] = useState<Date>(() => new Date())
    useLiveClock(
        date == null,
        () => setNow(flowing ? resolveDate() : new Date()),
        flowing ? TIME_FLOW_DISPLAY_INTERVAL_MS : undefined
    )

    // Resolving the zone costs a ~516 KB polygons fetch, which is why it is lazy — but
    // this control only exists while the settings panel is open, i.e. after the visitor
    // deliberately opened the place/time UI, and every field in it is stated in the
    // place's local time (Business Rule 12). So resolve on mount, and again whenever the
    // place changes (`onEnsureTimeZone` is keyed on the geopos).
    useEffect(() => {
        void onEnsureTimeZone()
    }, [onEnsureTimeZone])

    // The draft shows the moment in the place's local time (Business Rule 12).
    useEffect(() => {
        if (timeZone) {
            setDateDraft(dateToWallClock(date ?? now, timeZone))
            return
        }

        // No zone yet: a picked moment falls back to UTC once resolution has definitively
        // failed — the same zone commitDate() commits in — while the live "now" simply
        // waits for the zone, since a UTC clock standing in for the local one reads as a bug.
        setDateDraft(date && !timeZonePending ? dateToWallClock(date, { utcOffset: 0 }) : '')
    }, [date, now, timeZone, timeZonePending])

    const commitGeopos = () => {
        const lat = Number(latDraft.replace(',', '.'))
        const lon = Number(lonDraft.replace(',', '.'))

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const next: [number, number] = [clampLatitude(lat), clampLongitude(lon)]

            if (next[0] !== geopos[0] || next[1] !== geopos[1]) {
                onGeoposChange(next)
            }
        } else {
            setLatDraft(String(geopos[0]))
            setLonDraft(String(geopos[1]))
        }
    }

    const commitDate = async (value: string) => {
        setDateDraft(value)

        if (!value) {
            onDateChange(null)
            return
        }

        // The entered wall-clock time is local to the selected place (Business Rule 12)
        const zone = timeZone ?? (await onEnsureTimeZone())
        const parsed = wallClockToDate(value, zone ?? { utcOffset: 0 })

        if (parsed) {
            onDateChange(parsed)
        }
    }

    // Whether a dark sky ever comes at this place (polar day → never); the actual jump
    // is recomputed from the real "now" on click, this only drives the disabled state
    const tonightAvailable = useMemo(() => findTonightMoment(geopos, new Date()) != null, [geopos])

    const handleTonight = () => {
        const moment = findTonightMoment(geopos, new Date())

        if (moment) {
            onDateChange(moment)
        }
    }

    const rateSteps: Array<{ factor: number; icon: React.ReactNode; title: string }> = [
        {
            factor: 0.125,
            icon: <RewindIcon />,
            title: t('components.common.star-map.location.rate-slower-8', 'Замедлить в 8 раз')
        },
        {
            factor: 0.5,
            icon: <SlowDownIcon />,
            title: t('components.common.star-map.location.rate-slower-2', 'Замедлить в 2 раза')
        },
        {
            factor: 2,
            icon: <SpeedUpIcon />,
            title: t('components.common.star-map.location.rate-faster-2', 'Ускорить в 2 раза')
        },
        {
            factor: 8,
            icon: <FastForwardIcon />,
            title: t('components.common.star-map.location.rate-faster-8', 'Ускорить в 8 раз')
        }
    ]

    const rateLabel = formatTimeRate(timeRate, {
        minute: t('components.common.star-map.location.rate-minutes', 'мин/с'),
        hour: t('components.common.star-map.location.rate-hours', 'ч/с'),
        day: t('components.common.star-map.location.rate-days', 'сут/с')
    })

    const pauseTitle = t(
        'components.common.star-map.location.rate-pause',
        'Пауза: остановить время и сбросить скорость'
    )

    const handleMyLocation = async () => {
        const position = await onRequestBrowserLocation()

        if (position) {
            onGeoposChange(position)
        }
    }

    const handleGeoposKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            commitGeopos()
        }
    }

    return (
        <div className={styles.settingsGroup}>
            <div className={styles.settingsGroupTitle}>
                {t('components.common.star-map.location.title', 'Место и время')}
            </div>

            {/* TODO: вернуть выбор города. Раньше здесь стоял комбобокс по статическому
                каталогу `public/data/cities.json` (модуль cities.ts) — и каталог, и модуль
                удалены вместе с ним; см. BE-1 в features/star-atlas-upgrade.md. Пока место
                задаётся координатами и кнопкой «Моё местоположение», а StarMapStatusChip
                показывает координаты вместо названия города. */}

            <div className={styles.locationRow}>
                <Input
                    size={'small'}
                    label={t('components.common.star-map.location.latitude', 'Широта')}
                    value={latDraft}
                    onChange={(event) => setLatDraft(event.target.value)}
                    onBlur={commitGeopos}
                    onKeyDown={handleGeoposKeyDown}
                    inputMode={'decimal'}
                />
                <Input
                    size={'small'}
                    label={t('components.common.star-map.location.longitude', 'Долгота')}
                    value={lonDraft}
                    onChange={(event) => setLonDraft(event.target.value)}
                    onBlur={commitGeopos}
                    onKeyDown={handleGeoposKeyDown}
                    inputMode={'decimal'}
                />
            </div>

            <Button
                size={'small'}
                mode={'secondary'}
                icon={'Position'}
                loading={geolocationPending}
                onClick={handleMyLocation}
            >
                {t('components.common.star-map.location.my-location', 'Моё местоположение')}
            </Button>

            {/* Same picker as the event form (calendar + hour/minute selects) instead of a
                native datetime-local, which renders differently in every browser and is
                awkward on mobile. `portal` because the sidebar scrolls and would clip the
                popout; the zone is resolved as the popout opens, so the value the visitor
                sees is already the place's local time. */}
            <DateTimeInput
                size={'small'}
                placeholder={t('components.common.star-map.location.datetime-placeholder', 'Выберите дату и время')}
                hourLabel={t('components.common.star-map.location.hours', 'Часы')}
                minuteLabel={t('components.common.star-map.location.minutes', 'Минуты')}
                doneLabel={t('components.common.star-map.location.done', 'Готово')}
                showNowButton={true}
                nowLabel={t('components.common.star-map.location.now', 'Сейчас')}
                // An empty date already means "live now" here, so the button clears the
                // selection instead of freezing the map at the current minute
                onNow={() => onDateChange(null)}
                locale={i18n?.language === 'en' ? 'en' : 'ru'}
                portal={isDesktop}
                timePosition={'above'}
                value={dateDraft}
                onOpenChange={(isOpen) => isOpen && void onEnsureTimeZone()}
                onChange={(value) => void commitDate(value)}
            />

            {/* Time flow, the way a phone planetarium does it: the buttons multiply the speed
                of the clock, the middle one stops it. Slowing down bottoms out at real time —
                there is no reverse and no slow motion, only undoing an acceleration. */}
            <div
                className={styles.timeFlowRow}
                role={'group'}
                aria-label={t('components.common.star-map.location.rate-group', 'Течение времени')}
            >
                {rateSteps.map(({ factor, icon, title }, index) => (
                    <React.Fragment key={title}>
                        {index === 2 && (
                            <Button
                                size={'small'}
                                mode={'secondary'}
                                title={pauseTitle}
                                aria-label={pauseTitle}
                                onClick={onTimeFlowPause}
                            >
                                <PauseIcon />
                            </Button>
                        )}

                        <Button
                            size={'small'}
                            mode={'secondary'}
                            title={title}
                            aria-label={title}
                            disabled={factor < 1 ? !flowing : timeRate >= TIME_RATE_MAX}
                            onClick={() => onTimeRateChange(factor)}
                        >
                            {icon}
                        </Button>
                    </React.Fragment>
                ))}
            </div>

            {flowing && (
                <div className={styles.timezoneHint}>
                    {t('components.common.star-map.location.rate-current', 'Скорость времени')}
                    {': '}
                    {rateLabel}
                </div>
            )}

            <Button
                size={'small'}
                mode={'secondary'}
                icon={'Moon'}
                disabled={!tonightAvailable}
                title={
                    tonightAvailable
                        ? undefined
                        : t(
                              'components.common.star-map.location.tonight-unavailable',
                              'Ночь не наступает в выбранном месте'
                          )
                }
                onClick={handleTonight}
            >
                {t('components.common.star-map.location.tonight', 'Сегодня ночью')}
            </Button>

            {date && timeZonePending && !timeZone && (
                <div className={styles.timezoneHint}>
                    <Spinner className={styles.timezoneSpinner} />
                    {t('components.common.star-map.location.timezone-pending', 'Определяем часовой пояс…')}
                </div>
            )}

            {date && !timeZone && !timeZonePending && (
                <div className={styles.timezoneHint}>
                    {t(
                        'components.common.star-map.location.timezone-unknown',
                        'Часовой пояс не определён, время указано в UTC'
                    )}
                </div>
            )}

            {date && (
                <Button
                    size={'small'}
                    mode={'outline'}
                    icon={'Time'}
                    onClick={() => onDateChange(null)}
                >
                    {t('components.common.star-map.location.reset-to-now', 'Вернуться к «сейчас»')}
                </Button>
            )}
        </div>
    )
}

export default StarMapLocationControl
