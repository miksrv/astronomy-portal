import React from 'react'
import { Message, Skeleton } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { JobDetails, JobStatusBadge, PatrolDetails, useJobActions } from '@/components/pages/observatory'
import { OBSERVATORY_TIME_ZONE } from '@/components/pages/observatory/telescope-jobs/constants'
import { formatDate, jobTitle } from '@/components/pages/observatory/telescope-jobs/utils'
import { hasPermission } from '@/utils/permissions'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from '../styles.module.sass'

/** A job on its way through the observatory is asked for again at this pace */
const POLLING_MS = 120_000

/**
 * /observatory/jobs/:id — one telescope job: the target's facts beside the star map and its
 * altitude tonight, then the plan per filter with the frames captured. The author
 * cancels it and a manager reviews and manages it in the "⋯" menu of the header.
 *
 * Loaded in the browser: a rejected or cancelled job is visible to its author and managers only,
 * and the server side renders without the visitor's session.
 */
const TelescopeJobPage: NextPage = () => {
    const { t, i18n } = useTranslation()
    const router = useRouter()
    const id = typeof router.query.id === 'string' ? router.query.id : undefined

    const user = useAppSelector((state) => state.auth.user)
    const manager = hasPermission(user, ApiModel.Permission.TELESCOPE_MANAGE)

    const {
        data: job,
        error,
        isLoading
    } = API.useTelescopeGetJobQuery(id ?? '', {
        pollingInterval: POLLING_MS,
        skip: !id,
        skipPollingIfUnfocused: true
    })
    const { actions, dialogs } = useJobActions(job, manager)

    const jobsTitle = t('pages.observatory.jobs.title', 'Задания телескопа')
    const title = job ? jobTitle(job, t, i18n.language) : t('pages.observatory.job.title', 'Задание телескопа')
    // The browser's tab and search results: what the page is, not only the target's name
    const pageTitle = job
        ? job.patrol
            ? title
            : t('pages.observatory.job.title-named', 'Задание телескопа: {{name}}', { name: job.targetName })
        : t('pages.observatory.job.title', 'Задание телескопа')
    const notFound = (error as { status?: number } | undefined)?.status === 404

    return (
        <AppLayout
            canonical={id ? `observatory/jobs/${id}` : undefined}
            title={pageTitle}
            description={t(
                'pages.observatory.job.description',
                'Задание для телескопа обсерватории «Смотри на звёзды»: объект, план съёмки по фильтрам, видимость и ход съёмки.'
            )}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    { link: '/observatory', text: t('menu.observatory', 'Обсерватория') },
                    { link: '/observatory/jobs', text: jobsTitle }
                ]}
                actions={actions}
                titleAside={
                    job ? (
                        <span className={styles.jobLead}>
                            <JobStatusBadge job={job} />
                            <span className={styles.jobLeadMeta}>
                                {job.patrol
                                    ? t(
                                          'components.pages.observatory.telescope-jobs.patrol-lead',
                                          'ведёт сама обсерватория'
                                      )
                                    : t(
                                          'components.pages.observatory.telescope-jobs.lead-sent',
                                          '{{author}} · отправлено {{date}}',
                                          {
                                              author: job.author?.name ?? '',
                                              date: formatDate(job.createdAt, i18n.language, OBSERVATORY_TIME_ZONE)
                                          }
                                      )}
                                {manager &&
                                    !job.patrol &&
                                    ` · ${t(
                                        'components.pages.observatory.telescope-jobs.priority-value',
                                        'приоритет {{value}}',
                                        {
                                            value: job.priority > 0 ? `+${job.priority}` : job.priority
                                        }
                                    )}`}
                            </span>
                        </span>
                    ) : undefined
                }
            />

            {job?.patrol ? (
                <PatrolDetails job={job} />
            ) : job ? (
                <JobDetails job={job} />
            ) : isLoading || !id ? (
                <Skeleton
                    className={styles.jobSkeleton}
                    aria-hidden={true}
                />
            ) : (
                <Message type={notFound ? 'warning' : 'error'}>
                    {notFound
                        ? t(
                              'components.pages.observatory.telescope-jobs.not-found',
                              'Задание не найдено: его удалили, или оно видно только автору.'
                          )
                        : t(
                              'components.pages.observatory.telescope-jobs.load-failed',
                              'Не удалось загрузить задание.'
                          )}{' '}
                    <Link href={'/observatory/jobs'}>
                        {t('components.pages.observatory.telescope-jobs.back-to-list', 'Все задания →')}
                    </Link>
                </Message>
            )}

            {dialogs}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context, ['translation', 'observatory', 'starmap'])

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default TelescopeJobPage
