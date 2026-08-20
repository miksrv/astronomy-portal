import React, { useEffect, useState } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstroPhotoForm, AstroPhotoFormType } from '@/components/pages/photos'
import useSnackbar from '@/hooks/useSnackbar'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'

// TODO: Добавить проерку на редактирование фото - сохранять только если есть изменения
const PhotoFormPage: NextPage<object> = () => {
    const router = useRouter()
    const snackbar = useSnackbar()

    const { id } = router.query
    const { t } = useTranslation()

    const [formData, setFormData] = useState<AstroPhotoFormType>()
    const [formFile, setFormFile] = useState<File>()

    const {
        data: photoData,
        isLoading: photoLoading
        // isError
    } = API.usePhotosGetItemQuery(id as string, {
        skip: !id
    })

    const [createPhoto, { data: createdData, error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.usePhotosPostMutation()

    const [
        updatePhoto,
        {
            // data: updatedData,
            error: updateError,
            isLoading: updateLoading,
            isSuccess: updateSuccess
        }
    ] = API.usePhotoPatchMutation()

    const [
        uploadPhoto,
        {
            // data: uploadedData,
            // error: uploadError,
            isLoading: uploadLoading,
            isSuccess: uploadSuccess
        }
    ] = API.usePhotosPostUploadMutation()

    const handleSubmit = async (data?: AstroPhotoFormType) => {
        if (!data) {
            return
        }

        const updatedFormData = { ...formData, ...data, upload: undefined }

        setFormData(updatedFormData)
        setFormFile(data?.upload)

        if (updatedFormData?.id) {
            await updatePhoto(updatedFormData)
        } else {
            await createPhoto(updatedFormData)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    const currentPageTitle = photoData?.id ? 'Редактирование фотографии' : 'Добавление фотографии'

    useEffect(() => {
        if ((createdData as ApiModel.Photo)?.id) {
            setFormData({
                ...formData,
                id: (createdData as ApiModel.Photo).id
            })
        }
    }, [createdData])

    useEffect(() => {
        if ((formData?.id || photoData?.id) && formFile) {
            const formDataObject = new FormData()
            formDataObject.append('id', formData?.id || photoData?.id || '')
            formDataObject.append('file', formFile)
            void uploadPhoto(formDataObject)
        }
    }, [formData?.id, photoData?.id, formFile])

    const saveError = createError || updateError

    // A field-tied error is already surfaced inline on the field itself
    // (plus a scroll to it - see AstroPhotoForm) - a toast on top would
    // just be noise. Only a message with no specific field needs its own,
    // since there's nothing to scroll to.
    useEffect(() => {
        if (saveError && Object.keys(getFieldErrors(saveError)).length === 0) {
            snackbar.push(getErrorMessage(saveError) ?? 'Ошибка сохранения', { type: 'error' })
        }
    }, [saveError])

    // Once saved, go straight to the photo's page - but only once there's
    // nothing left pending: if this submit included a new file, that still
    // has to finish uploading first (the effect above kicks it off once
    // `formData.id` is set).
    const targetPhotoId = formData?.id

    useEffect(() => {
        if (!targetPhotoId) {
            return
        }

        if (formFile ? uploadSuccess : createSuccess || updateSuccess) {
            void router.push(`/photos/${targetPhotoId}`)
        }
    }, [targetPhotoId, formFile, createSuccess, updateSuccess, uploadSuccess])

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
                        link: '/photos',
                        text: t('menu.astrophoto', 'Астрофото')
                    }
                ]}
            />

            <AstroPhotoForm
                disabled={
                    photoLoading ||
                    createLoading ||
                    updateLoading ||
                    uploadLoading ||
                    createSuccess ||
                    updateSuccess ||
                    uploadSuccess
                }
                initialData={photoData}
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
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.PHOTOS_MANAGE, '/photos')

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

export default PhotoFormPage
