import React, { useMemo } from 'react'
import { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { Container, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { CHART_COLORS, getBaseChartConfig } from '@/utils/charts'
import { formatDate } from '@/utils/dates'
import {
    CombinedStatus,
    getCombinedStatus,
    getStatusLabel,
    STATUS_COLORS,
    STATUS_ORDER
} from '@/utils/eventRegistrations'

import styles from './styles.module.sass'

interface EventStatisticProps {
    eventId: string
}

const AGE_GROUP_LABELS: Record<string, string> = {
    '18to25': '18–25',
    '26to35': '26–35',
    '36to50': '36–50',
    over50: '50+',
    under18: 'до 18'
}

const AGE_GROUP_ORDER = ['under18', '18to25', '26to35', '36to50', 'over50']

// Children's ages are entered per-child at booking time (`EventBookingForm`'s
// age selector only offers 5–17), so these buckets are sized for that range
// (2-year steps, with the last one widened to 15–17 to cover the remainder)
// rather than mirroring the adult under18/18to25/... groups above.
const CHILD_AGE_GROUP_LABELS: Record<string, string> = {
    '11to12': '11–12',
    '13to14': '13–14',
    '15to17': '15–17',
    '5to6': '5–6',
    '7to8': '7–8',
    '9to10': '9–10'
}

const CHILD_AGE_GROUP_ORDER = ['5to6', '7to8', '9to10', '11to12', '13to14', '15to17']

const getChildAgeGroup = (age: number): string => {
    if (age <= 6) {
        return '5to6'
    }
    if (age <= 8) {
        return '7to8'
    }
    if (age <= 10) {
        return '9to10'
    }
    if (age <= 12) {
        return '11to12'
    }
    if (age <= 14) {
        return '13to14'
    }
    return '15to17'
}

export const EventStatistic: React.FC<EventStatisticProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useEventGetStatisticQuery(eventId)

    // Registration status breakdown is derived on the client from the same list
    // the "Регистрации" table already fetches (RTK Query dedupes the identical
    // request), since the /statistic endpoint intentionally counts only
    // pending/confirmed registrations and doesn't expose a per-status split.
    const { data: registrationsData, isLoading: isRegistrationsLoading } =
        API.useEventGetRegistrationsListQuery(eventId)

    // The page's getServerSideProps already fetched this event for the title,
    // so this dedupes against the same cached request rather than firing a
    // second one. Unlike `Events::upcoming()` (which turns `availableTickets`
    // into a remaining count), `Events::show()` — what this hook calls —
    // returns the raw `max_tickets` unmodified, so `availableTickets` here is
    // the event's total *capacity*. Remaining seats = capacity minus adults
    // already booked (tickets are only counted by adults — children are free
    // and don't consume capacity, mirroring `Events::upcoming()`'s own logic).
    const { data: eventData, isLoading: isEventLoading } = API.useEventGetItemQuery(eventId)

    const ticketsCapacity = eventData?.availableTickets
    const soldTickets = data?.totalAdults ?? 0
    const remainingTickets = ticketsCapacity != null ? Math.max(0, ticketsCapacity - soldTickets) : undefined
    const percentSold =
        ticketsCapacity && ticketsCapacity > 0 ? Math.round((soldTickets / ticketsCapacity) * 100) : null

    const seatsLoading = isEventLoading || isLoading

    const avgGroupSize = data && data.totalRegistrations > 0 ? data.totalParticipants / data.totalRegistrations : null

    const progressColor =
        percentSold == null ? undefined : percentSold >= 100 ? 'red' : percentSold >= 80 ? 'orange' : 'green'

    const statusCounts = useMemo(() => {
        const counts: Record<CombinedStatus, number> = {
            canceled: 0,
            confirmed: 0,
            failed: 0,
            pending: 0,
            refunded: 0
        }

        for (const item of registrationsData?.items ?? []) {
            counts[getCombinedStatus(item)] += 1
        }

        return counts
    }, [registrationsData])

    // Children's age distribution, bucketed from the same registrations list
    // (see `statusCounts` above for why — RTK Query dedupes the request).
    // Only 'pending'/'confirmed' bookings count, mirroring the adult
    // `ageGroups` breakdown the /statistic endpoint computes server-side, so
    // cancelled/failed/refunded registrations don't skew the distribution.
    const childrenAgeGroupCounts = useMemo(() => {
        const counts: Record<string, number> = {
            '11to12': 0,
            '13to14': 0,
            '15to17': 0,
            '5to6': 0,
            '7to8': 0,
            '9to10': 0
        }

        for (const item of registrationsData?.items ?? []) {
            const combinedStatus = getCombinedStatus(item)
            if (combinedStatus !== 'confirmed' && combinedStatus !== 'pending') {
                continue
            }

            for (const age of item.childrenAges ?? []) {
                counts[getChildAgeGroup(age)] += 1
            }
        }

        return counts
    }, [registrationsData])

    // Registrations are bucketed into hourly bins and split by combined status
    // (client-side, from the same registrations list the status pie chart and
    // "Регистрации" table already fetch — RTK Query dedupes the identical
    // request) so the chart shows both *when* people register and *what
    // happened* to those bookings — e.g. a burst of registrations after a
    // mailing that mostly ended up unpaid. Bins with zero registrations are
    // simply absent rather than plotted as zero, since a real-time x-axis
    // already spaces sparse activity correctly.
    const hourlyStatusBuckets = useMemo(() => {
        const buckets = new Map<number, Record<CombinedStatus, number>>()

        for (const item of registrationsData?.items ?? []) {
            const hourStart = new Date(item.createdAt).setMinutes(0, 0, 0)

            if (!buckets.has(hourStart)) {
                buckets.set(hourStart, { canceled: 0, confirmed: 0, failed: 0, pending: 0, refunded: 0 })
            }

            buckets.get(hourStart)![getCombinedStatus(item)] += 1
        }

        const hours = Array.from(buckets.keys()).sort((a, b) => a - b)

        return { buckets, hours }
    }, [registrationsData])

    // Timeline chart config (hourly registration counts, stacked by status, over real datetime x-axis)
    const timelineConfig: EChartsOption = {
        ...getBaseChartConfig(),
        legend: {
            type: 'plain',
            orient: 'horizontal',
            left: 5,
            bottom: 0,
            itemWidth: 14,
            itemHeight: 14,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: '12px' }
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                show: true,
                hideOverlap: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            axisTick: { show: true },
            axisLine: { show: true, lineStyle: { color: CHART_COLORS.border } },
            splitLine: { show: true, lineStyle: { width: 1, color: CHART_COLORS.border } }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisTick: { show: true },
            axisLine: { show: true, lineStyle: { color: CHART_COLORS.border } },
            axisLabel: { show: true, color: CHART_COLORS.textSecondary, fontSize: '11px' },
            splitLine: { show: true, lineStyle: { width: 1, color: CHART_COLORS.border } }
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 },
            formatter: (params) => {
                const points = Array.isArray(params) ? params : [params]
                const timestamp = (points[0]?.value as [number, number])[0]
                const total = points.reduce((sum, p) => sum + ((p.value as [number, number])[1] ?? 0), 0)

                const rows = points
                    .filter((p) => ((p.value as [number, number])[1] ?? 0) > 0)
                    .map((p) => `${String(p.marker)} ${p.seriesName}: ${(p.value as [number, number])[1]}`)
                    .join('<br/>')

                return `${formatDate(new Date(timestamp), 'D MMM, HH:00')}<br/>${rows}<br/>${t(
                    'pages.stargazing.statistic-hourly-total',
                    'Всего: {{count}}',
                    { count: total }
                )}`
            }
        },
        series: STATUS_ORDER.map((status) => ({
            name: getStatusLabel(t, status),
            type: 'bar',
            stack: 'registrations',
            barWidth: 18,
            itemStyle: { color: STATUS_COLORS[status] },
            data: hourlyStatusBuckets.hours.map((hour) => [hour, hourlyStatusBuckets.buckets.get(hour)![status]])
        }))
    }

    // Gender pie chart config
    const genderConfig: EChartsOption = {
        backgroundColor: CHART_COLORS.background,
        legend: {
            type: 'plain',
            orient: 'horizontal',
            left: 5,
            bottom: 0,
            itemWidth: 14,
            itemHeight: 14,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: '12px' }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 }
        },
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                data: [
                    {
                        name: t('pages.stargazing.statistic-male', 'Мужчины'),
                        value: data?.genderStats.male ?? 0,
                        itemStyle: { color: '#5470c6' }
                    },
                    {
                        name: t('pages.stargazing.statistic-female', 'Женщины'),
                        value: data?.genderStats.female ?? 0,
                        itemStyle: { color: '#ee6666' }
                    },
                    {
                        name: t('pages.stargazing.statistic-gender-unknown', 'Не указан'),
                        value: data?.genderStats.unknown ?? 0,
                        itemStyle: { color: '#fac858' }
                    }
                ],
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 13, fontWeight: 'bold' }
                }
            }
        ]
    }

    // Registration status pie chart config
    const statusConfig: EChartsOption = {
        backgroundColor: CHART_COLORS.background,
        legend: {
            type: 'plain',
            orient: 'horizontal',
            left: 5,
            bottom: 0,
            itemWidth: 14,
            itemHeight: 14,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: '12px' }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 }
        },
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                data: STATUS_ORDER.map((status) => ({
                    name: getStatusLabel(t, status),
                    value: statusCounts[status],
                    itemStyle: { color: STATUS_COLORS[status] }
                })),
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 13, fontWeight: 'bold' }
                }
            }
        ]
    }

    // Age groups bar chart config
    const sortedAgeGroups = AGE_GROUP_ORDER.map((groupKey) => {
        const found = data?.ageGroups.find((g) => g.group === groupKey)
        return found?.count ?? 0
    })

    const ageGroupsConfig: EChartsOption = {
        backgroundColor: CHART_COLORS.background,
        grid: {
            left: 10,
            right: 10,
            top: 15,
            bottom: 25,
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 }
        },
        xAxis: {
            type: 'category',
            data: AGE_GROUP_ORDER.map((k) => AGE_GROUP_LABELS[k]),
            axisLabel: {
                show: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            axisLine: {
                show: true,
                lineStyle: { color: CHART_COLORS.border }
            },
            axisTick: { show: true }
        },
        yAxis: {
            type: 'value',
            axisTick: { show: true },
            axisLine: {
                show: true,
                lineStyle: { color: CHART_COLORS.border }
            },
            axisLabel: {
                show: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            splitLine: {
                show: true,
                lineStyle: { width: 1, color: CHART_COLORS.border }
            }
        },
        series: [
            {
                type: 'bar',
                data: sortedAgeGroups,
                itemStyle: { color: '#5470c6' }
            }
        ]
    }

    // Children's age groups bar chart config
    const childrenAgeGroupsConfig: EChartsOption = {
        backgroundColor: CHART_COLORS.background,
        grid: {
            left: 10,
            right: 10,
            top: 15,
            bottom: 25,
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: CHART_COLORS.background,
            borderColor: CHART_COLORS.border,
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 }
        },
        xAxis: {
            type: 'category',
            data: CHILD_AGE_GROUP_ORDER.map((k) => CHILD_AGE_GROUP_LABELS[k]),
            axisLabel: {
                show: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            axisLine: {
                show: true,
                lineStyle: { color: CHART_COLORS.border }
            },
            axisTick: { show: true }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisTick: { show: true },
            axisLine: {
                show: true,
                lineStyle: { color: CHART_COLORS.border }
            },
            axisLabel: {
                show: true,
                color: CHART_COLORS.textSecondary,
                fontSize: '11px'
            },
            splitLine: {
                show: true,
                lineStyle: { width: 1, color: CHART_COLORS.border }
            }
        },
        series: [
            {
                type: 'bar',
                data: CHILD_AGE_GROUP_ORDER.map((k) => childrenAgeGroupCounts[k]),
                itemStyle: { color: '#91cc75' }
            }
        ]
    }

    return (
        <div className={styles.wrapper}>
            {/* KPI cards */}
            <div className={styles.kpiRow}>
                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        {t('pages.stargazing.statistic-registrations', 'Регистраций')}
                    </div>
                    <div className={styles.kpiValue}>
                        {isLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : (
                            (data?.totalRegistrations ?? '—')
                        )}
                    </div>
                    {!isLoading && data && (
                        <div className={styles.kpiSub}>
                            {t('pages.stargazing.statistic-registrations-participants', '→ {{count}} участников', {
                                count: data.totalParticipants
                            })}
                        </div>
                    )}
                </Container>

                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>{t('pages.stargazing.statistic-participants', 'Участников')}</div>
                    <div className={styles.kpiValue}>
                        {isLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : (
                            (data?.totalParticipants ?? '—')
                        )}
                    </div>
                    {!isLoading && data && (
                        <div className={styles.kpiSub}>
                            {t(
                                'pages.stargazing.statistic-participants-breakdown',
                                '{{adults}} взрослых · {{children}} детей',
                                {
                                    adults: data.totalAdults,
                                    children: data.totalChildren
                                }
                            )}
                        </div>
                    )}
                </Container>

                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        {t('pages.stargazing.statistic-avg-group-size', 'Средний размер группы')}
                    </div>
                    <div className={styles.kpiValue}>
                        {isLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : (
                            (avgGroupSize?.toFixed(1) ?? '—')
                        )}
                    </div>
                    {!isLoading && avgGroupSize != null && (
                        <div className={styles.kpiSub}>
                            {t('pages.stargazing.statistic-avg-group-size-unit', 'чел. на заявку')}
                        </div>
                    )}
                </Container>

                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        {t('pages.stargazing.statistic-seats-remaining', 'Осталось мест')}
                    </div>
                    <div className={styles.kpiValue}>
                        {seatsLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : (
                            (remainingTickets ?? '—')
                        )}
                    </div>
                    {!seatsLoading && percentSold != null && (
                        <div className={styles.kpiProgress}>
                            <div
                                className={styles.kpiProgressTrack}
                                role='progressbar'
                                aria-valuenow={percentSold}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <div
                                    className={styles.kpiProgressBar}
                                    data-color={progressColor}
                                    style={{ width: `${Math.min(percentSold, 100)}%` }}
                                />
                            </div>
                            <div className={styles.kpiSub}>
                                {t('pages.stargazing.statistic-percent-sold', 'Забронировано {{percent}}%', {
                                    percent: percentSold
                                })}
                            </div>
                        </div>
                    )}
                </Container>
            </div>

            {/* Registration timeline + status breakdown */}
            <div className={styles.chartsRow}>
                <Container className={styles.chartWide}>
                    <h3 className={styles.chartTitle}>
                        {t('pages.stargazing.statistic-timeline', 'Динамика регистраций')}
                    </h3>
                    {isRegistrationsLoading ? (
                        <Skeleton style={{ height: '300px', width: '100%' }} />
                    ) : (
                        <ReactECharts
                            option={timelineConfig}
                            style={{ height: '300px', width: '100%' }}
                        />
                    )}
                </Container>

                <Container className={styles.chartHalf}>
                    <h3 className={styles.chartTitle}>
                        {t('pages.stargazing.statistic-registration-status', 'Статусы регистраций')}
                    </h3>
                    {isRegistrationsLoading ? (
                        <Skeleton style={{ height: '300px', width: '100%' }} />
                    ) : (
                        <ReactECharts
                            option={statusConfig}
                            style={{ height: '300px', width: '100%' }}
                        />
                    )}
                </Container>
            </div>

            {/* Gender + Age groups (adults & children) */}
            <div className={styles.chartsRow}>
                <Container className={styles.chartHalf}>
                    <h3 className={styles.chartTitle}>
                        {t('pages.stargazing.statistic-gender', 'Распределение по полу')}
                    </h3>
                    {isLoading ? (
                        <Skeleton style={{ height: '260px', width: '100%' }} />
                    ) : (
                        <ReactECharts
                            option={genderConfig}
                            style={{ height: '260px', width: '100%' }}
                        />
                    )}
                </Container>

                <Container className={styles.chartHalf}>
                    <h3 className={styles.chartTitle}>
                        {t('pages.stargazing.statistic-age-groups-adults', 'Возрастные группы взрослых')}
                    </h3>
                    {isLoading ? (
                        <Skeleton style={{ height: '260px', width: '100%' }} />
                    ) : (
                        <ReactECharts
                            option={ageGroupsConfig}
                            style={{ height: '260px', width: '100%' }}
                        />
                    )}
                </Container>

                <Container className={styles.chartHalf}>
                    <h3 className={styles.chartTitle}>
                        {t('pages.stargazing.statistic-age-groups-children', 'Возрастные группы детей')}
                    </h3>
                    {isRegistrationsLoading ? (
                        <Skeleton style={{ height: '260px', width: '100%' }} />
                    ) : (
                        <ReactECharts
                            option={childrenAgeGroupsConfig}
                            style={{ height: '260px', width: '100%' }}
                        />
                    )}
                </Container>
            </div>
        </div>
    )
}
