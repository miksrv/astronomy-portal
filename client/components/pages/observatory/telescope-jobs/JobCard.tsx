import React from 'react'
import { cn, Container, Icon, Progress } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { FilterTag, FilterTagList } from '@/components/common/filter-tag'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'

import { OBSERVATORY_TIME_ZONE } from './constants'
import { JobAuthor } from './JobAuthor'
import { JobStatusBadge } from './JobStatusBadge'
import {
    displayStatus,
    formatDate,
    formatDuration,
    framesDone,
    jobLink,
    jobTitle,
    patrolDone,
    totalSeconds
} from './utils'

import styles from './styles.module.sass'

interface JobCardProps {
    job: ApiModel.TelescopeJob
    /** The job's place in the queue (1 = shot next), before the name */
    position?: number
    className?: string
}

/**
 * One telescope job as a block of its own — on the /observatory dashboard and in the lists of
 * /observatory/jobs alike: its place in the queue before the target's name, the status, the
 * coordinates, the author, the date it finished and the total time, the plan per filter and the
 * frames captured. The whole card is the link to the job's page.
 *
 * A patrol night (the observatory's own job) has no coordinates or author: its card counts the
 * galaxies shot of the planned ones, and the frames with their time.
 */
export const JobCard: React.FC<JobCardProps> = ({ job, position, className }) => {
    const { t, i18n } = useTranslation()

    const patrol = job.patrol ? patrolDone(job) : null
    const { done, total } = patrol ?? framesDone(job)
    const paused = displayStatus(job) === 'paused'
    const percent = total ? Math.round((done / total) * 100) : 0
    const showProgress = job.status !== 'pending' && job.status !== 'rejected'
    const title = jobTitle(job, t, i18n.language)
    const exposure = job.plan[0]?.exposure ?? 0

    return (
        <Container
            className={cn(
                styles.jobCard,
                job.status === 'completed' && styles.jobCompleted,
                job.status === 'pending' && styles.jobPending,
                paused && styles.jobPaused,
                paused && styles.held,
                className
            )}
        >
            <Link
                className={styles.jobLink}
                href={jobLink(job.id)}
                title={t('components.pages.observatory.telescope-jobs.card-link', 'Задание телескопа: {{name}}', {
                    name: title
                })}
            >
                <div className={styles.jobContent}>
                    <div className={styles.jobTitleRow}>
                        {position !== undefined && (
                            <span
                                className={styles.jobPosition}
                                aria-label={t(
                                    'components.pages.observatory.telescope-jobs.position',
                                    'Место в очереди: {{position}}',
                                    { position }
                                )}
                            >
                                {position}
                            </span>
                        )}
                        <span className={styles.jobTitle}>{title}</span>
                        <span className={styles.jobBadges}>
                            <JobStatusBadge job={job} />
                        </span>
                    </div>

                    {patrol ? (
                        <div className={styles.jobMeta}>
                            <span className={styles.jobMetaItem}>
                                <Icon
                                    name={'Search'}
                                    aria-hidden
                                />
                                {t('components.pages.observatory.telescope-jobs.patrol-source', 'Агент обсерватории')}
                            </span>
                            <span
                                className={styles.metaDivider}
                                aria-hidden
                            >
                                •
                            </span>
                            <span className={styles.jobMetaItem}>
                                <Icon
                                    name={'Time'}
                                    aria-hidden
                                />
                                {t(
                                    'components.pages.observatory.telescope-jobs.row-total',
                                    '{{frames}} кадров · {{duration}}',
                                    {
                                        duration: formatDuration(patrol.frames * exposure, t),
                                        frames: patrol.frames
                                    }
                                )}
                            </span>
                        </div>
                    ) : (
                        <div className={styles.jobMeta}>
                            <span className={styles.jobMetaItem}>
                                <Icon
                                    name={'Position'}
                                    aria-hidden
                                />
                                {formatRAShort(job.ra ?? undefined)} {formatDECShort(job.dec ?? undefined)}
                            </span>
                            <span
                                className={styles.metaDivider}
                                aria-hidden
                            >
                                •
                            </span>
                            <JobAuthor
                                job={job}
                                avatarSize={'tiny'}
                                className={styles.jobMetaItem}
                            />
                            <span
                                className={styles.metaDivider}
                                aria-hidden
                            >
                                •
                            </span>
                            {job.finishedAt && (
                                <>
                                    <span className={styles.jobMetaItem}>
                                        <Icon
                                            name={'Calendar'}
                                            aria-hidden
                                        />
                                        {formatDate(job.finishedAt, i18n.language, OBSERVATORY_TIME_ZONE)}
                                    </span>
                                    <span
                                        className={styles.metaDivider}
                                        aria-hidden
                                    >
                                        •
                                    </span>
                                </>
                            )}
                            <span className={styles.jobMetaItem}>
                                <Icon
                                    name={'Time'}
                                    aria-hidden
                                />
                                {t(
                                    'components.pages.observatory.telescope-jobs.row-total',
                                    '{{frames}} кадров · {{duration}}',
                                    {
                                        duration: formatDuration(totalSeconds(job.plan), t),
                                        frames: total
                                    }
                                )}
                            </span>
                        </div>
                    )}

                    <FilterTagList aria-label={t('components.pages.observatory.telescope-jobs.plan', 'План съёмки')}>
                        {job.plan.map((row) => (
                            <FilterTag
                                key={row.filter}
                                filter={row.filter}
                            >
                                {patrol
                                    ? t(
                                          'components.pages.observatory.telescope-jobs.patrol-frames',
                                          '{{count}} × {{exposure}} с на галактику',
                                          {
                                              count: row.count,
                                              exposure: row.exposure
                                          }
                                      )
                                    : t(
                                          'components.pages.observatory.telescope-jobs.row-frames',
                                          '{{count}} × {{exposure}} с',
                                          {
                                              count: row.count,
                                              exposure: row.exposure
                                          }
                                      )}
                            </FilterTag>
                        ))}
                    </FilterTagList>
                </div>

                {showProgress && (
                    <div className={styles.jobProgress}>
                        <span className={styles.jobPercent}>{percent}%</span>
                        <Progress
                            value={percent}
                            height={4}
                            color={job.status === 'completed' ? 'green' : 'main'}
                            aria-label={t(
                                'components.pages.observatory.telescope-jobs.progress',
                                'Снято {{percent}}%',
                                {
                                    percent
                                }
                            )}
                        />
                        <span className={styles.caption}>
                            {patrol
                                ? t(
                                      'components.pages.observatory.telescope-jobs.patrol-done-short',
                                      '{{done}} из {{total}} галактик',
                                      {
                                          done,
                                          total
                                      }
                                  )
                                : t(
                                      'components.pages.observatory.telescope-jobs.frames-done-short',
                                      '{{done}} из {{total}} кадров',
                                      {
                                          done,
                                          total
                                      }
                                  )}
                        </span>
                    </div>
                )}
            </Link>

            <Icon
                className={styles.chevron}
                name={'KeyboardRight'}
                aria-hidden
            />
        </Container>
    )
}
