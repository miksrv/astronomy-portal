import React, { useEffect } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventForm, EventFormType } from '@/components/pages/stargazing'
import useSnackbar from '@/hooks/useSnackbar'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'

const StargazingFormPage: NextPage<object> = () => {
    const router = useRouter()
    const snackbar = useSnackbar()

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
    const saveError = createError || patchError

    // A field-tied error is already surfaced inline on the field itself
    // (plus a scroll to it - see EventForm) - a toast on top would just be
    // noise. Only a message with no specific field needs its own, since
    // there's nothing to scroll to.
    useEffect(() => {
        if (saveError && Object.keys(getFieldErrors(saveError)).length === 0) {
            snackbar.push(getErrorMessage(saveError) ?? t('pages.stargazing.save-error', 'Ошибка сохранения'), {
                type: 'error'
            })
        }
    }, [saveError])

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

            <EventForm
                disabled={isLoading || isSuccess}
                initialData={eventData}
                error={saveError}
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
