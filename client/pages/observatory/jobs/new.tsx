import React from 'react'
import { Button, Message, Skeleton } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, useAppDispatch, useAppSelector, wrapper } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { JobForm } from '@/components/pages/observatory'
import { jobLink } from '@/components/pages/observatory/telescope-jobs/utils'
import { TELESCOPE_JOBS_ENABLED } from '@/utils/constants'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from '../styles.module.sass'

/**
 * /observatory/jobs/new — the form of a new telescope job, for a signed-in visitor (a guest is
 * asked to sign in). Once sent, the page goes on to the new job.
 */
const NewTelescopeJobPage: NextPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const router = useRouter()

    const signedIn = !!useAppSelector((state) => state.auth.user?.id)
    const { data: config, isError: configFailed } = API.useTelescopeGetConfigQuery(undefined, { skip: !signedIn })

    const jobsTitle = t('pages.observatory.jobs.title', 'Задания телескопа')
    const title = t('pages.observatory.job-new.title', 'Новое задание')

    return (
        <AppLayout
            canonical={'observatory/jobs/new'}
            title={title}
            description={t(
                'pages.observatory.job-new.description',
                'Отправьте задание телескопу обсерватории «Смотри на звёзды»: объект, фильтры и выдержки.'
            )}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    { link: '/observatory', text: t('menu.observatory', 'Обсерватория') },
                    { link: '/observatory/jobs', text: jobsTitle }
                ]}
            />

            {!signedIn ? (
                <Message
                    type={'info'}
                    title={t(
                        'components.pages.observatory.telescope-jobs.sign-in-title',
                        'Войдите, чтобы отправить задание'
                    )}
                >
                    <p className={styles.signInText}>
                        {t(
                            'components.pages.observatory.telescope-jobs.sign-in-text',
                            'Это бесплатно: вход через Google, Яндекс, VK или по ссылке на почту. Мы напишем вам о первых кадрах и о готовности.'
                        )}
                    </p>
                    <Button
                        mode={'primary'}
                        icon={'User'}
                        label={t('components.pages.observatory.telescope-jobs.sign-in', 'Войти')}
                        onClick={() => dispatch(openAuthDialog())}
                    />
                </Message>
            ) : config ? (
                <JobForm
                    config={config}
                    cancelHref={'/observatory/jobs'}
                    onCreated={(job) => router.push(jobLink(job.id))}
                />
            ) : configFailed ? (
                <Message type={'error'}>
                    {t(
                        'components.pages.observatory.telescope-jobs.config-failed',
                        'Не удалось загрузить настройки телескопа. Обновите страницу или попробуйте позже.'
                    )}
                </Message>
            ) : (
                <Skeleton
                    className={styles.jobSkeleton}
                    aria-hidden={true}
                />
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            if (!TELESCOPE_JOBS_ENABLED) {
                return { notFound: true }
            }

            const { translations } = await initSSRLocale(store, context, ['translation', 'observatory', 'starmap'])

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default NewTelescopeJobPage
