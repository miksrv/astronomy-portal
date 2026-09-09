import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { DateTimeInput } from '@/components/ui/date-time-input'

import { MOBILE_MAX_WIDTH } from './constants'
import { findTonightMoment } from './nightPreset'
import { stepDate, TimeStep, TimeStepDirection } from './timeStep'
import { dateToWallClock, formatUtcOffset, ResolvedTimeZone, wallClockToDate } from './timezone'

import styles from './styles.module.sass'

interface StarMapLocationControlProps {
    geopos: [number, number]
    date: Date | null
    timeZone: ResolvedTimeZone | null
    /** True while the timezone of the current geopos is still being resolved */
    timeZonePending: boolean
    geolocationPending: boolean
    onGeoposChange: (geopos: [number, number]) => void
    onDateChange: (date: Date | null) => void
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
    onGeoposChange,
    onDateChange,
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

    // The draft shows the selected moment in the place's local time (Business Rule 12).
    // While the zone is still resolving the field stays empty (a hint below says why);
    // if resolution failed for good, fall back to UTC — the same zone commitDate() uses.
    useEffect(() => {
        if (!date) {
            setDateDraft('')
            return
        }

        if (timeZone) {
            setDateDraft(dateToWallClock(date, timeZone))
            return
        }

        if (!timeZonePending) {
            setDateDraft(dateToWallClock(date, { utcOffset: 0 }))
        }
    }, [date, timeZone, timeZonePending])

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

    // Steps start from the selected moment, or from the real "now" when the map is live;
    // either way the result is a frozen moment (chip shows it, "back to now" reappears).
    // A day step keeps the place's wall-clock time, so it needs the zone first.
    const handleStep = async (step: TimeStep, direction: TimeStepDirection) => {
        const base = date ?? new Date()
        const zone = step === 'day' ? (timeZone ?? (await onEnsureTimeZone())) : timeZone

        onDateChange(stepDate(base, step, direction, zone))
    }

    const timeSteps: Array<{ step: TimeStep; direction: TimeStepDirection; label: string; title: string }> = [
        {
            step: 'day',
            direction: -1,
            label: t('components.common.star-map.location.step-day-back', '−1 д'),
            title: t('components.common.star-map.location.step-day-back-title', 'На день раньше')
        },
        {
            step: 'hour',
            direction: -1,
            label: t('components.common.star-map.location.step-hour-back', '−1 ч'),
            title: t('components.common.star-map.location.step-hour-back-title', 'На час раньше')
        },
        {
            step: 'hour',
            direction: 1,
            label: t('components.common.star-map.location.step-hour-forward', '+1 ч'),
            title: t('components.common.star-map.location.step-hour-forward-title', 'На час позже')
        },
        {
            step: 'day',
            direction: 1,
            label: t('components.common.star-map.location.step-day-forward', '+1 д'),
            title: t('components.common.star-map.location.step-day-forward-title', 'На день позже')
        }
    ]

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
                label={t('components.common.star-map.location.datetime', 'Дата и время (местное для точки)')}
                placeholder={t('components.common.star-map.location.datetime-placeholder', 'Выберите дату и время')}
                hourLabel={t('components.common.star-map.location.hours', 'Часы')}
                minuteLabel={t('components.common.star-map.location.minutes', 'Минуты')}
                doneLabel={t('components.common.star-map.location.done', 'Готово')}
                locale={i18n?.language === 'en' ? 'en' : 'ru'}
                portal={isDesktop}
                timePosition={'above'}
                value={dateDraft}
                onOpenChange={(isOpen) => isOpen && void onEnsureTimeZone()}
                onChange={(value) => void commitDate(value)}
            />

            <div
                className={styles.timeStepRow}
                role={'group'}
                aria-label={t('components.common.star-map.location.step-group', 'Сдвинуть время')}
            >
                {timeSteps.map(({ step, direction, label, title }) => (
                    <Button
                        key={`${step}_${direction}`}
                        size={'small'}
                        mode={'secondary'}
                        title={title}
                        aria-label={title}
                        onClick={() => void handleStep(step, direction)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

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

            {date && timeZone && (
                <div className={styles.timezoneHint}>
                    {t('components.common.star-map.location.local-time', 'Местное время')}
                    {': '}
                    {formatUtcOffset(timeZone, date)}
                    {timeZone.zoneName ? ` · ${timeZone.zoneName}` : ''}
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
