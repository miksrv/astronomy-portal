import React from 'react'
import { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { Container, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { CHART_COLORS, getBaseChartConfig } from '@/utils/charts'

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

export const EventStatistic: React.FC<EventStatisticProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useEventGetStatisticQuery(eventId)

    // Timeline chart config (step-line over real datetime x-axis)
    const timelineConfig: EChartsOption = {
        ...getBaseChartConfig(),
        legend: { show: false },
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
            textStyle: { color: CHART_COLORS.textPrimary, fontSize: 12 }
        },
        series: [
            {
                name: t('pages.stargazing.statistic-cumulative', 'Нарастающим итогом'),
                type: 'line',
                step: 'end',
                data: data?.registrationTimeline.map((item) => [item.datetime, item.cumulative]) ?? [],
                showSymbol: true,
                symbolSize: 5,
                lineStyle: { color: '#5470c6', width: 2 },
                itemStyle: { color: '#5470c6' },
                areaStyle: { color: 'rgba(84, 112, 198, 0.15)' }
            }
        ]
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
                </Container>

                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>{t('pages.stargazing.statistic-children', 'Детей')}</div>
                    <div className={styles.kpiValue}>
                        {isLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : (
                            (data?.totalChildren ?? '—')
                        )}
                    </div>
                </Container>

                <Container className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        {t('pages.stargazing.statistic-average-age', 'Средний возраст')}
                    </div>
                    <div className={styles.kpiValue}>
                        {isLoading ? (
                            <Skeleton style={{ height: '36px', width: '80px' }} />
                        ) : data?.averageAge != null ? (
                            <>
                                {Math.round(data.averageAge)}
                                <span className={styles.kpiSub}>{t('pages.stargazing.statistic-years', 'лет')}</span>
                            </>
                        ) : (
                            '—'
                        )}
                    </div>
                </Container>
            </div>

            {/* Registration timeline chart */}
            <Container>
                <h3 className={styles.chartTitle}>
                    {t('pages.stargazing.statistic-timeline', 'Динамика регистраций')}
                </h3>
                {isLoading ? (
                    <Skeleton style={{ height: '300px', width: '100%' }} />
                ) : (
                    <ReactECharts
                        option={timelineConfig}
                        style={{ height: '300px', width: '100%' }}
                    />
                )}
            </Container>

            {/* Gender + Age groups */}
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
                        {t('pages.stargazing.statistic-age-groups', 'Возрастные группы')}
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
            </div>
        </div>
    )
}
