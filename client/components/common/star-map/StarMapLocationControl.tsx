import React, { useEffect, useId, useMemo, useState } from 'react'
import { Button, cn, Input, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { City, findNearestCity, getCityDisplayName, loadCities, matchCities } from './cities'
import { findTonightMoment } from './nightPreset'
import { stepDate, TimeStep, TimeStepDirection } from './timeStep'
import { dateToWallClock, formatUtcOffset, ResolvedTimeZone, wallClockToDate } from './timezone'
import { useListNavigation } from './useListNavigation'

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

    // City picker (static catalog, Business Rule 4): the list loads on first focus; the
    // field mirrors the nearest catalog city of the current position once the list is in,
    // so a manual/geolocated position outside any city leaves it blank
    const [cities, setCities] = useState<City[] | null>(null)
    const [cityQuery, setCityQuery] = useState<string>('')
    const [cityListOpen, setCityListOpen] = useState(false)
    const cityListId = useId()

    const ensureCities = () => {
        if (cities) {
            return
        }

        void loadCities().then((list) => setCities((current) => current ?? list))
    }

    useEffect(() => {
        setLatDraft(String(geopos[0]))
        setLonDraft(String(geopos[1]))
    }, [geopos])

    // Mirror the nearest catalog city into the field whenever the position changes or
    // the catalog arrives — but never while the list is open, i.e. while the user is
    // typing; closing the list (blur/Escape/select) re-syncs, which also discards an
    // abandoned partial query
    useEffect(() => {
        if (!cities || cityListOpen) {
            return
        }

        const nearest = findNearestCity(geopos, cities)
        setCityQuery(nearest ? getCityDisplayName(nearest, i18n?.language) : '')
    }, [geopos, cities, cityListOpen, i18n?.language])

    const cityResults = useMemo(
        () => (cities && cityListOpen ? matchCities(cities, cityQuery) : []),
        [cities, cityListOpen, cityQuery]
    )
    const {
        activeIndex: activeCityIndex,
        setActiveIndex: setActiveCityIndex,
        reset: resetActiveCity,
        handleKeyDown: handleCityListKeyDown
    } = useListNavigation(cityResults.length)

    const cityQueryLongEnough = cityQuery.trim().length >= 2

    const selectCity = (city: City) => {
        setCityQuery(getCityDisplayName(city, i18n?.language))
        setCityListOpen(false)
        resetActiveCity()

        if (city.lat !== geopos[0] || city.lon !== geopos[1]) {
            onGeoposChange([city.lat, city.lon])
        }
    }

    const handleCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setCityListOpen(false)
            return
        }

        if (!cityResults.length || handleCityListKeyDown(event)) {
            return
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            const chosen = cityResults[activeCityIndex] ?? cityResults[0]

            if (chosen) {
                selectCity(chosen)
            }
        }
    }

    const activeCityId = cityResults[activeCityIndex] ? `${cityListId}-${cityResults[activeCityIndex]!.id}` : undefined

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

            <Input
                size={'small'}
                icon={'Search'}
                label={t('components.common.star-map.location.city', 'Город')}
                placeholder={t('components.common.star-map.location.city-placeholder', 'Москва, Санкт-Петербург…')}
                value={cityQuery}
                role={'combobox'}
                aria-autocomplete={'list'}
                aria-expanded={cityListOpen && cityResults.length > 0}
                aria-controls={cityListId}
                aria-activedescendant={cityListOpen ? activeCityId : undefined}
                autoComplete={'off'}
                onFocus={() => {
                    ensureCities()
                    setCityListOpen(true)
                }}
                onBlur={() => setCityListOpen(false)}
                onChange={(event) => {
                    ensureCities()
                    setCityQuery(event.target.value)
                    setCityListOpen(true)
                    resetActiveCity()
                }}
                onKeyDown={handleCityKeyDown}
            />

            {cityListOpen && cityQueryLongEnough && !cities && (
                <div className={styles.cityStatus}>
                    <Spinner className={styles.timezoneSpinner} />
                </div>
            )}

            {cityListOpen && cityQueryLongEnough && cities && !cityResults.length && (
                <div className={styles.cityStatus}>
                    {t('components.common.star-map.location.city-no-results', 'Город не найден')}
                </div>
            )}

            {cityListOpen && cityResults.length > 0 && (
                <ul
                    id={cityListId}
                    role={'listbox'}
                    className={styles.cityResults}
                    // Keep focus in the input so blur doesn't close the list before the click lands
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {cityResults.map((city, index) => (
                        <li
                            key={city.id}
                            id={`${cityListId}-${city.id}`}
                            role={'option'}
                            aria-selected={index === activeCityIndex}
                        >
                            <Button
                                unstyled={true}
                                tabIndex={-1}
                                className={cn(styles.cityResult, index === activeCityIndex && styles.cityResultActive)}
                                onMouseEnter={() => setActiveCityIndex(index)}
                                onClick={() => selectCity(city)}
                            >
                                <span className={styles.cityResultName}>
                                    {getCityDisplayName(city, i18n?.language)}
                                </span>
                                <span className={styles.cityResultCountry}>{city.country}</span>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

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

            <Input
                size={'small'}
                type={'datetime-local'}
                label={t('components.common.star-map.location.datetime', 'Дата и время (местное для точки)')}
                value={dateDraft}
                onFocus={() => void onEnsureTimeZone()}
                onChange={(event) => void commitDate(event.target.value)}
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
