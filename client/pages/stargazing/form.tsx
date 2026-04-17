import React, { useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Dialog, Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventForm, EventFormType } from '@/components/pages/stargazing'

const StargazingFormPage: NextPage<object> = () => {
    const router = useRouter()

    const { id: rawId } = router.query
    const id = typeof rawId === 'string' ? rawId : undefined
    const { t } = useTranslation()

    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const {
        data: eventData,
        isLoading: eventLoading
        // isError
    } = API.useEventGetItemQuery(id as string, {
        skip: !id
    })

    const [createEvent, { error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.useEventCreatePostMutation()

    const [patchEvent, { error: patchError, isLoading: patchLoading, isSuccess: patchSuccess }] =
        API.useEventPatchMutation()

    const [updateCover, { isLoading: coverLoading }] = API.useEventUpdateCoverMutation()

    const [deleteEvent, { isLoading: deleteLoading }] = API.useEventDeleteMutation()

    const isEditMode = !!id

    const handleSubmit = async (data?: EventFormType) => {
        if (!data) {
            return
        }

        if (isEditMode && id) {
            // Upload new cover first if a file was selected
            if (data.upload instanceof File) {
                const coverFormData = new FormData()
                coverFormData.append('upload', data.upload)
                await updateCover({ id, formData: coverFormData })
            }

            // Patch remaining fields (without the upload File)
            const { upload: _upload, ...restData } = data
            const result = await patchEvent({ ...restData, id })

            if (!('error' in result)) {
                await router.push(`/stargazing/${id}`)
            }
        } else {
            const formDataObject = new FormData()

            Object.entries(data || {}).forEach(([key, value]) => {
                if (key !== 'upload') {
                    formDataObject.append(key, value as string)
                }

                if (key === 'upload' && value instanceof File) {
                    formDataObject.append('upload', value)
                }
            })

            const result = await createEvent(formDataObject)

            if (!('error' in result) && 'data' in result && result.data && 'id' in result.data) {
                await router.push(`/stargazing/${result.data.id}`)
            }
        }
    }

    const handleCancel = () => {
        router.back()
    }

    const handleDeleteConfirm = async () => {
        if (!id) {
            return
        }

        setShowDeleteDialog(false)
        await deleteEvent(id)
        await router.push('/stargazing')
    }

    const isLoading = eventLoading || createLoading || patchLoading || coverLoading || deleteLoading
    const isSuccess = createSuccess || patchSuccess

    const currentPageTitle = isEditMode
        ? t('pages.stargazing.edit-event', 'Редактирование астровыезда')
        : t('pages.stargazing.add-event', 'Добавление астровыезда')

    return (
        <AppLayout
            title={currentPageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={currentPageTitle}
                currentPage={currentPageTitle}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            >
                {isEditMode && (
                    <Button
                        icon={'ReportError'}
                        mode={'secondary'}
                        label={t('common.archive', 'Архивировать')}
                        disabled={isLoading}
                        onClick={() => setShowDeleteDialog(true)}
                    />
                )}
            </AppToolbar>

            {(createError || patchError || isSuccess) && (
                <Message
                    style={{ marginBottom: '10px' }}
                    type={createError || patchError ? 'error' : 'success'}
                >
                    {(createError || patchError) && <div>{t('pages.stargazing.save-error', 'Ошибка сохранения')}</div>}
                    {isSuccess && <div>{t('pages.stargazing.save-success', 'Астровыезд сохранен')}</div>}
                </Message>
            )}

            <EventForm
                disabled={isLoading || isSuccess}
                initialData={eventData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />

            <Dialog
                open={showDeleteDialog}
                title={t('pages.stargazing.archive-confirm-title', 'Архивировать мероприятие?')}
                onCloseDialog={() => setShowDeleteDialog(false)}
            >
                <p>
                    {t(
                        'pages.stargazing.archive-confirm-body',
                        'Вы уверены? Мероприятие будет скрыто от пользователей.'
                    )}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <Button
                        mode={'secondary'}
                        label={t('common.cancel', 'Отмена')}
                        onClick={() => setShowDeleteDialog(false)}
                    />
                    <Button
                        mode={'primary'}
                        variant={'negative'}
                        label={t('common.confirm', 'Подтвердить')}
                        onClick={handleDeleteConfirm}
                    />
                </div>
            </Dialog>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/stargazing', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/stargazing', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingFormPage
