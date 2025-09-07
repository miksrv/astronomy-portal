import React, { useEffect, useState } from 'react'
import { Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstroPhotoForm, AstroPhotoFormType } from '@/components/pages/photos'

// TODO: Добавить проерку на редактирование фото - сохранять только если есть изменения
const PhotoFormPage: NextPage<object> = () => {
    const router = useRouter()

    const { id } = router.query
    const { t } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

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
        if (userRole !== ApiModel.UserRole.ADMIN) {
            void router.push('/photos')
        }
    }, [userRole])

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

            {(createError || updateError || createSuccess || updateSuccess || uploadSuccess) && (
                <Message
                    style={{ marginBottom: '10px' }}
                    type={createError || updateError ? 'error' : 'success'}
                >
                    {(createError || updateError) && <div>{'Ошибка сохранения'}</div>}
                    {(createSuccess || updateSuccess) && <div>{'Фотография сохранена'}</div>}
                    {uploadSuccess && <div>{'Фотография загружена'}</div>}
                </Message>
            )}

            <AstroPhotoForm
                disabled={photoLoading || createLoading || updateLoading || uploadLoading}
                initialData={photoData}
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
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default PhotoFormPage
