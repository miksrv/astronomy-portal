import React from 'react'
import { Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventForm, EventFormType } from '@/components/pages/stargazing'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage } from '@/utils/errors'

const StargazingFormPage: NextPage<object> = () => {
    const router = useRouter()

    const { id: rawId } = router.query
    const id = typeof rawId === 'string' ? rawId : undefined
    const { t } = useTranslation()

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

    const isLoading = eventLoading || createLoading || patchLoading || coverLoading
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
            />

            {(createError || patchError || isSuccess) && (
                <Message
                    style={{ marginBottom: '10px' }}
                    type={createError || patchError ? 'error' : 'success'}
                >
                    {(createError || patchError) && (
                        <div>
                            {getErrorMessage(createError || patchError) ||
                                t('pages.stargazing.save-error', 'Ошибка сохранения')}
                        </div>
                    )}
                    {isSuccess && <div>{t('pages.stargazing.save-success', 'Астровыезд сохранен')}</div>}
                </Message>
            )}

            <EventForm
                disabled={isLoading || isSuccess}
                initialData={eventData}
                error={createError || patchError}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const guard = await requirePermissionSSR(
                store,
                context,
                [ApiModel.Permission.EVENTS_CREATE, ApiModel.Permission.EVENTS_UPDATE],
                '/stargazing'
            )

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default StargazingFormPage
