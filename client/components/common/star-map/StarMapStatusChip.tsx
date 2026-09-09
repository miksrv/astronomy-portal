import React, { useState } from 'react'
import { Button, cn, Icon, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { TIME_FLOW_DISPLAY_INTERVAL_MS } from './constants'
import { formatGeopos, formatLocalClock, formatLocalDate, formatLocalDateTime } from './statusChip'
import { formatTimeRate, TIME_RATE_MIN } from './timeFlow'
import { formatUtcOffset, ResolvedTimeZone } from './timezone'
import { useLiveClock } from './useLiveClock'

import styles from './styles.module.sass'

interface StarMapStatusChipProps {
    /** Observer position [lat, lon] in degrees */
    geopos: [number, number]
    /** Selected moment; null means the live "now" sky */
    date: Date | null
    timeZone: ResolvedTimeZone | null
    /** True while the timezone of the current geopos is being resolved */
    timeZonePending: boolean
    /** Seconds of sky per real second; `1` is real time (see timeFlow.ts) */
    timeRate: number
    /** The instant the map is currently drawn for — polled while the flow runs */
    resolveDate: () => Date
    /** Frozen moment → back to "now" */
    onResetToNow: () => void
    /** Live sky → open the settings panel to change the place/time */
    onOpenSettings: () => void
}

/**
 * Always-visible "place · moment" caption on the map (bottom corner on desktop, under
 * the header on mobile). It answers two questions the closed settings panel otherwise
 * hides — "whose sky is this?" (after a denied geolocation the fallback is the
 * observatory) and "is this frozen in time?" — and doubles as the caption for the
 * screenshot workflows in features/star-atlas-upgrade.md.
 *
 * The live clock only shows once the place's timezone is known: resolving it fetches
 * timezones.json (~516 KB), which a bare visit must never trigger (see useStarMapLocation).
 */
const StarMapStatusChip: React.FC<StarMapStatusChipProps> = ({
    geopos,
    date,
    timeZone,
    timeZonePending,
    timeRate,
    resolveDate,
    onResetToNow,
    onOpenSettings
}) => {
    const { t } = useTranslation()

    const frozen = date != null
    const flowing = timeRate > TIME_RATE_MIN

    // Live wall clock for the "now" state — re-rendered by the shared minute tick, paused
    // while the tab is hidden, caught up on return. While the flow runs the chip follows
    // the simulated clock instead, polled once a second: the animation itself never goes
    // through React, so this caption is the only thing that re-renders with it.
    const [now, setNow] = useState<Date>(() => new Date())
    useLiveClock(
        !frozen && timeZone != null,
        () => setNow(flowing ? resolveDate() : new Date()),
        flowing ? TIME_FLOW_DISPLAY_INTERVAL_MS : undefined
    )

    const hemisphereLetters = {
        n: t('components.common.star-map.compass.n', 'С'),
        s: t('components.common.star-map.compass.s', 'Ю'),
        e: t('components.common.star-map.compass.e', 'В'),
        w: t('components.common.star-map.compass.w', 'З')
    }

    const nowLabel = t('components.common.star-map.status.now', 'Сейчас')

    let timeLabel: React.ReactNode

    if (flowing) {
        // A running clock is neither "now" nor a chosen moment: show the date it has
        // reached plus the speed it is running at
        const zone = timeZone ?? { utcOffset: 0 }
        const rate = formatTimeRate(timeRate, {
            minute: t('components.common.star-map.location.rate-minutes', 'мин/с'),
            hour: t('components.common.star-map.location.rate-hours', 'ч/с'),
            day: t('components.common.star-map.location.rate-days', 'сут/с')
        })

        timeLabel = `${formatLocalDateTime(now, zone)} · ${rate}`
    } else if (!frozen) {
        timeLabel = timeZone ? `${nowLabel} ${formatLocalClock(now, timeZone)}` : nowLabel
    } else if (timeZonePending) {
        // The exact wall-clock time is unknown until the zone resolves; the date alone
        // is safe to show (UTC-based, at most a day off in the extreme case)
        timeLabel = (
            <>
                {formatLocalDate(date, { utcOffset: 0 })}
                <Spinner className={styles.statusChipSpinner} />
            </>
        )
    } else {
        // Resolution failed → UTC, matching what the location control commits with
        const zone = timeZone ?? { utcOffset: 0 }

        timeLabel = `${formatLocalDateTime(date, zone)} ${formatUtcOffset(zone, date)}`
    }

    const title =
        frozen || flowing
            ? t('components.common.star-map.location.reset-to-now', 'Вернуться к «сейчас»')
            : t('components.common.star-map.status.change-place-time', 'Изменить место и время')

    // TODO: подписывать место названием города, когда вернётся выбор города в
    // StarMapLocationControl — до тех пор чип показывает только координаты
    const placeLabel = formatGeopos(geopos, hemisphereLetters)

    return (
        <Button
            unstyled={true}
            icon={'Position'}
            title={title}
            aria-label={title}
            className={cn(styles.statusChip, (frozen || flowing) && styles.statusChipFrozen)}
            onClick={frozen || flowing ? onResetToNow : onOpenSettings}
        >
            <span className={styles.statusChipPlace}>{placeLabel}</span>
            <span
                className={styles.statusChipSeparator}
                aria-hidden={'true'}
            >
                ·
            </span>
            <span className={styles.statusChipTime}>
                {(frozen || flowing) && <Icon name={'Time'} />}
                {timeLabel}
            </span>
        </Button>
    )
}

export default StarMapStatusChip
