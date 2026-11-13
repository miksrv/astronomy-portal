import React, { useMemo } from 'react'
import { Container, Table } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StarMap } from '@/components/common'
import { Fact, FactList } from '@/components/ui'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'

import { MAP_CONFIG } from './constants'
import { formatDuration, formatTime, patrolDone, starMapLink } from './utils'

import styles from './styles.module.sass'

interface PatrolDetailsProps {
    job: ApiModel.TelescopeJob
}

interface VisitRow {
    index: number
    name: string
    object: string | null
    time: string
    frames: number
    position: string
}

/** How close the map comes to the galaxy (Celestial zoom), as on a visitor's job page */
const MAP_ZOOM = 4

/**
 * A night of the supernova patrol on its page: what the patrol is and how the night went (the
 * galaxies shot of the planned ones, the frames, the first and the last frame) beside the map
 * centred on the galaxy shot last (the night's galaxies are spread over the whole sky: one map of
 * them all is unreadable), then one table row per galaxy in the order they were shot, the name
 * linking to the catalog page when there is one.
 */
export const PatrolDetails: React.FC<PatrolDetailsProps> = ({ job }) => {
    const { t, i18n } = useTranslation()

    const visits = useMemo(() => job.visits ?? [], [job.visits])
    const { done, total, frames } = patrolDone(job)
    const exposure = job.plan[0]?.exposure ?? 0

    const last = visits[visits.length - 1]?.target
    const objects = useMemo(() => (last ? [{ dec: last.dec, name: last.name, ra: last.ra }] : []), [last])
    const center = useMemo<[number, number] | undefined>(() => (last ? [last.ra, last.dec] : undefined), [last])
    const viewControls = useMemo(
        () => ({
            openFull: last
                ? {
                      href: starMapLink(last.ra, last.dec),
                      label: t(
                          'components.pages.observatory.telescope-jobs.details-open-map',
                          'Открыть на звёздной карте'
                      )
                  }
                : undefined,
            zoomIn: t('components.pages.observatory.status.map-zoom-in', 'Приблизить'),
            zoomOut: t('components.pages.observatory.status.map-zoom-out', 'Отдалить')
        }),
        [t, last]
    )

    const rows: VisitRow[] = visits.map((visit, index) => ({
        frames: visit.frames,
        index: index + 1,
        name: visit.target.name,
        object: visit.target.object,
        position: `${formatRAShort(visit.target.ra)} ${formatDECShort(visit.target.dec)}`,
        time: formatTime(visit.time, i18n.language)
    }))

    return (
        <div className={styles.details}>
            <Container className={styles.detailsTarget}>
                <div className={styles.patrolGrid}>
                    <div className={styles.patrolInfo}>
                        <p className={styles.patrolText}>
                            {t(
                                'components.pages.observatory.telescope-jobs.patrol-about',
                                'Когда телескоп свободен от заданий, обсерватория сама обходит яркие галактики и снимает каждую несколькими короткими кадрами. Сравнивая снимки разных ночей, можно заметить вспыхнувшую сверхновую. Каждая ночь патруля — отдельное задание.'
                            )}
                        </p>
                        <FactList className={styles.detailsFacts}>
                            <Fact label={t('components.pages.observatory.telescope-jobs.patrol-galaxies', 'Галактик')}>
                                {total > done
                                    ? t(
                                          'components.pages.observatory.telescope-jobs.patrol-done-short',
                                          '{{done}} из {{total}} галактик',
                                          { done, total }
                                      )
                                    : done}
                            </Fact>
                            <Fact
                                label={t('components.pages.observatory.telescope-jobs.patrol-frames-label', 'Кадров')}
                            >
                                {t(
                                    'components.pages.observatory.telescope-jobs.row-total',
                                    '{{frames}} кадров · {{duration}}',
                                    {
                                        duration: formatDuration(frames * exposure, t),
                                        frames
                                    }
                                )}
                            </Fact>
                            <Fact
                                label={t(
                                    'components.pages.observatory.telescope-jobs.patrol-window',
                                    'Первый и последний кадр'
                                )}
                            >
                                {formatTime(job.firstFrameAt, i18n.language)}
                                {' – '}
                                {formatTime(job.lastFrameAt, i18n.language)}
                            </Fact>
                        </FactList>
                    </div>

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
                <Table<VisitRow>
                    data={rows}
                    noDataCaption={t(
                        'components.pages.observatory.telescope-jobs.patrol-no-visits',
                        'Галактики этой ночи ещё не сняты.'
                    )}
                    columns={[
                        {
                            accessor: 'index',
                            header: '№'
                        },
                        {
                            accessor: 'name',
                            formatter: (value, list, index) =>
                                list[index]?.object ? (
                                    <Link
                                        href={`/objects/${list[index].object}`}
                                        target={'_blank'}
                                        title={t(
                                            'components.pages.observatory.telescope-jobs.patrol-object-link',
                                            'Открыть страницу объекта в новой вкладке'
                                        )}
                                    >
                                        {String(value)}
                                    </Link>
                                ) : (
                                    String(value)
                                ),
                            header: t('components.pages.observatory.telescope-jobs.patrol-galaxy', 'Галактика')
                        },
                        {
                            accessor: 'position',
                            header: t('components.pages.observatory.telescope-jobs.patrol-position', 'Координаты')
                        },
                        {
                            accessor: 'time',
                            header: t('components.pages.observatory.telescope-jobs.patrol-time', 'Начало съёмки')
                        },
                        {
                            accessor: 'frames',
                            header: t('components.pages.observatory.telescope-jobs.form-count', 'Кадров')
                        }
                    ]}
                />
            </Container>
        </div>
    )
}
