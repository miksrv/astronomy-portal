import React, { useEffect, useState } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppDispatch, useAppSelector, wrapper } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { JobsList } from '@/components/pages/observatory'
import {
    ACTIVE_STATUSES,
    FINISHED_STATUSES,
    PAGE_SIZE,
    PRIVATE_STATUSES
} from '@/components/pages/observatory/telescope-jobs/constants'
import { SegmentedControl } from '@/components/ui/segmented-control/SegmentedControl'
import { Switch } from '@/components/ui/switch/Switch'
import { hasPermission } from '@/utils/permissions'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from '../styles.module.sass'

type Scope = 'all' | 'mine'

/**
 * /observatory/jobs — the telescope jobs (FEAT-30 phase 2) in one list, by pages: the active ones in
 * the order the observatory shoots them (the default), or every job — the finished after the
 * active, the latest first. Open to everyone; a signed-in visitor sends a
 * job (/observatory/jobs/new) and may narrow the list to their own. Each row leads to the job's
 * page, where it is managed.
 */
const TelescopeJobsPage: NextPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const user = useAppSelector((state) => state.auth.user)
    const signedIn = !!user?.id
    const manager = hasPermission(user, ApiModel.Permission.TELESCOPE_MANAGE)

    const [scope, setScope] = useState<Scope>('all')
    const [activeOnly, setActiveOnly] = useState(true)
    const [page, setPage] = useState(1)
    const mine = signedIn && scope === 'mine'

    // "Мои" needs a session: after a logout fall back to every job
    useEffect(() => {
        if (!signedIn) {
            setScope('all')
        }
    }, [signedIn])

    const title = t('pages.observatory.jobs.title', 'Задания телескопа')

    // A manager and the author see their rejected and cancelled jobs too
    const allStatuses = [...ACTIVE_STATUSES, ...FINISHED_STATUSES, ...(mine || manager ? PRIVATE_STATUSES : [])]
    const scopeQuery = mine ? { mine: true } : manager ? { all: true } : {}

    return (
        <AppLayout
            canonical={'observatory/jobs'}
            title={title}
            description={t(
                'pages.observatory.jobs.description',
                'Задания для удалённого телескопа обсерватории «Смотри на звёзды»: очередь съёмки, выполненные задания и как отправить своё.'
            )}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[{ link: '/observatory', text: t('menu.observatory', 'Обсерватория') }]}
                lead={t(
                    'pages.observatory.jobs.lead',
                    'Телескоп обсерватории снимает задания посетителей сайта: выберите объект и фильтры, администратор проверит задание, и обсерватория снимет его в ясную ночь.'
                )}
                // The page's one action, the same "Добавить" as on the catalogs; a guest is asked
                // to sign in first (subscription = authentication)
                actions={[
                    {
                        icon: 'PlusCircle',
                        key: 'create',
                        label: t('components.pages.observatory.telescope-jobs.new-job', 'Добавить'),
                        ...(signedIn
                            ? { link: '/observatory/jobs/new' }
                            : { onClick: () => dispatch(openAuthDialog()) })
                    }
                ]}
            />

            <JobsList
                id={'telescope-jobs'}
                title={
                    activeOnly
                        ? t('components.pages.observatory.telescope-jobs.queue-title', 'Очередь')
                        : t('components.pages.observatory.telescope-jobs.all-title', 'Все задания')
                }
                showCount={true}
                numbered={activeOnly && !mine}
                perPage={PAGE_SIZE}
                page={page}
                onChangePage={(next) => {
                    setPage(next)
                    window.scrollTo({ behavior: 'smooth', top: 0 })
                }}
                query={{ ...scopeQuery, sort: 'queue', status: activeOnly ? ACTIVE_STATUSES : allStatuses }}
                action={
                    <>
                        {signedIn && (
                            <SegmentedControl<Scope>
                                className={styles.jobsScope}
                                size={'small'}
                                aria-label={t(
                                    'components.pages.observatory.telescope-jobs.views',
                                    'Какие задания показать'
                                )}
                                value={scope}
                                options={[
                                    {
                                        key: 'all',
                                        label: t('components.pages.observatory.telescope-jobs.view-all', 'Все')
                                    },
                                    {
                                        key: 'mine',
                                        label: t('components.pages.observatory.telescope-jobs.view-mine', 'Мои')
                                    }
                                ]}
                                onChange={(next) => {
                                    setScope(next)
                                    setPage(1)
                                }}
                            />
                        )}
                        <span>{t('components.pages.observatory.telescope-jobs.active-only', 'Только активные')}</span>
                        <Switch
                            checked={activeOnly}
                            tone={'accent'}
                            aria-label={t('components.pages.observatory.telescope-jobs.active-only', 'Только активные')}
                            onChange={(checked) => {
                                setActiveOnly(checked)
                                setPage(1)
                            }}
                        />
                    </>
                }
                empty={
                    activeOnly
                        ? mine
                            ? t(
                                  'components.pages.observatory.telescope-jobs.empty-mine',
                                  'У вас нет заданий в очереди.'
                              )
                            : t(
                                  'components.pages.observatory.telescope-jobs.empty-active',
                                  'Очередь пуста — в ясную ночь телескоп ищет сверхновые.'
                              )
                        : t('components.pages.observatory.telescope-jobs.empty-all', 'Заданий пока нет.')
                }
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context, ['translation', 'observatory'])

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default TelescopeJobsPage
