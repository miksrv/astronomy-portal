import React, { useMemo } from 'react'
import { Container, Message, Table } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StarMap, VisibilityChart } from '@/components/common'
import { FilterTag } from '@/components/common/filter-tag'
import { Fact, FactList } from '@/components/ui'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'

import { MAP_CONFIG } from './constants'
import { JobAuthor } from './JobAuthor'
import { formatDate, formatDuration, isFinal, starMapLink } from './utils'

import styles from './styles.module.sass'

interface JobDetailsProps {
    job: ApiModel.TelescopeJob
}

interface PlanTableRow {
    filter: ApiModel.FilterTypes
    exposure: number
    count: number
    done: number
    seconds: number
}

/** How close the map comes to the target (Celestial zoom) */
const MAP_ZOOM = 4

/**
 * Everything about one telescope job, on its page, in two cards. The target: its facts and
 * conditions beside the star map, tonight's altitude under them (a card this obvious needs no
 * title). The plan: one table row per filter with the frames captured, over the card's width.
 */
export const JobDetails: React.FC<JobDetailsProps> = ({ job }) => {
    const { t, i18n } = useTranslation()

    const final = isFinal(job.status)
    // Always set for a visitor's job (only a patrol night has none, and it has a page of its own)
    const ra = job.ra ?? 0
    const dec = job.dec ?? 0

    const objects = useMemo(() => [{ dec, name: job.targetName, ra }], [dec, ra, job.targetName])
    const center = useMemo<[number, number]>(() => [ra, dec], [ra, dec])
    const viewControls = useMemo(
        () => ({
            openFull: {
                href: starMapLink(ra, dec),
                label: t('components.pages.observatory.telescope-jobs.details-open-map', 'Открыть на звёздной карте')
            },
            zoomIn: t('components.pages.observatory.status.map-zoom-in', 'Приблизить'),
            zoomOut: t('components.pages.observatory.status.map-zoom-out', 'Отдалить')
        }),
        [t, ra, dec]
    )

    const planRows: PlanTableRow[] = job.plan.map((row) => ({
        count: row.count,
        done: Math.min(job.progress[row.filter] ?? 0, row.count),
        exposure: row.exposure,
        filter: row.filter,
        seconds: row.count * row.exposure
    }))

    return (
        <div className={styles.details}>
            {job.statusReason && (
                <Message type={job.status === 'rejected' || job.status === 'failed' ? 'warning' : 'info'}>
                    {job.statusReason}
                </Message>
            )}
            {job.cancelRequested && !final && (
                <Message type={'info'}>
                    {t(
                        'components.pages.observatory.telescope-jobs.cancel-requested',
                        'Отмена запрошена: обсерватория снимет задание с расписания в безопасный момент.'
                    )}
                </Message>
            )}

            <Container className={styles.detailsTarget}>
                <div className={styles.detailsTargetGrid}>
                    <FactList className={styles.detailsFacts}>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-name', 'Название')}>
                            {job.targetName}
                            {job.object && (
                                <>
                                    {' · '}
                                    <Link href={`/objects/${job.object}`}>
                                        {t('components.pages.observatory.telescope-jobs.details-object', 'в каталоге')}
                                    </Link>
                                </>
                            )}
                        </Fact>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-ra', 'Прямое восхождение')}>
                            {formatRAShort(ra)}
                        </Fact>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-dec', 'Склонение')}>
                            {formatDECShort(dec)}
                        </Fact>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-altitude', 'Снимать выше')}>
                            {job.minAltitude}°
                        </Fact>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-moon', 'От Луны')}>
                            {job.minMoonSeparation
                                ? t(
                                      'components.pages.observatory.telescope-jobs.details-moon-value',
                                      'не ближе {{degrees}}°',
                                      {
                                          degrees: job.minMoonSeparation
                                      }
                                  )
                                : t('components.pages.observatory.telescope-jobs.details-moon-any', 'не важно')}
                        </Fact>
                        <Fact label={t('components.pages.observatory.telescope-jobs.details-until', 'Действует до')}>
                            {job.validUntil
                                ? formatDate(job.validUntil, i18n.language)
                                : t('components.pages.observatory.telescope-jobs.details-no-date', 'без срока')}
                        </Fact>
                        <Fact
                            label={
                                job.author
                                    ? t('components.pages.observatory.telescope-jobs.details-author', 'Автор')
                                    : t('components.pages.observatory.telescope-jobs.details-source', 'Источник')
                            }
                        >
                            <JobAuthor job={job} />
                        </Fact>
                    </FactList>
                    <VisibilityChart
                        className={styles.detailsChart}
                        bare={true}
                        ra={ra}
                        dec={dec}
                        name={job.targetName}
                    />

                    <div className={styles.map}>
                        <StarMap
                            className={styles.mapCanvas}
                            fitContainer={true}
                            interactive={false}
                            zoom={MAP_ZOOM}
                            center={center}
                            objects={objects}
                            viewControls={viewControls}
                            config={MAP_CONFIG}
                        />
                    </div>
                </div>
            </Container>

            <Container className={styles.detailsPlan}>
                <Table<PlanTableRow>
                    data={planRows}
                    columns={[
                        {
                            accessor: 'filter',
                            formatter: (value) => <FilterTag filter={value as ApiModel.FilterTypes} />,
                            header: t('components.pages.observatory.telescope-jobs.form-filter', 'Фильтр')
                        },
                        {
                            accessor: 'exposure',
                            formatter: (value) =>
                                t('components.pages.observatory.telescope-jobs.seconds', '{{count}} с', {
                                    count: Number(value)
                                }),
                            header: t('components.pages.observatory.telescope-jobs.details-exposure', 'Выдержка')
                        },
                        {
                            accessor: 'count',
                            header: t('components.pages.observatory.telescope-jobs.form-count', 'Кадров')
                        },
                        {
                            accessor: 'done',
                            header: t('components.pages.observatory.telescope-jobs.details-done', 'Снято')
                        },
                        {
                            accessor: 'seconds',
                            formatter: (value) => formatDuration(Number(value), t),
                            header: t('components.pages.observatory.telescope-jobs.details-time', 'Время')
                        }
                    ]}
                />
            </Container>
        </div>
    )
}
