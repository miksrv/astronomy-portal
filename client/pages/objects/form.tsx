import React, { useEffect, useState } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstroObjectForm, AstroObjectFormType } from '@/components/pages/objects'
import useSnackbar from '@/hooks/useSnackbar'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatObjectName } from '@/utils/strings'

// TODO: Добавить обработку ошибки, когда пытаемся отредактировать объект, которого нет
// TODO: Добавить индикатор загрузки когда загружаем редактируемый объет
// TODO: Для handleCancel добавить проверку на изменения в форме
const ObjectFormPage: NextPage<object> = () => {
    const router = useRouter()
    const snackbar = useSnackbar()

    const { id } = router.query
    const { t } = useTranslation()

    const [savedName, setSavedName] = useState<string>()

    const {
        data: objectData,
        isLoading: objectLoading
        // isError
    } = API.useObjectsGetItemQuery(id as string, {
        skip: !id
    })

    const [createObject, { error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.useObjectsPostMutation()

    const [updateObject, { error: updateError, isLoading: updateLoading, isSuccess: updateSuccess }] =
        API.useObjectsPatchMutation()

    const handleSubmit = async (formData?: AstroObjectFormType) => {
        if (!formData) {
            return
        }

        setSavedName(formData.name)

        if (id) {
            await updateObject(formData)
        } else {
            await createObject(formData)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    useEffect(() => {
        if ((createSuccess || updateSuccess) && savedName) {
            void router.push(`/objects/${savedName}`)
        }
    }, [createSuccess, updateSuccess, savedName])

    const saveError = createError || updateError

    // A field-tied error is already surfaced inline on the field itself
    // (plus a scroll to it - see AstroObjectForm) - a toast on top would
    // just be noise. Only a message with no specific field needs its own,
    // since there's nothing to scroll to.
    useEffect(() => {
        if (saveError && Object.keys(getFieldErrors(saveError)).length === 0) {
            snackbar.push(getErrorMessage(saveError) ?? 'Ошибка сохранения', { type: 'error' })
        }
    }, [saveError])

    const currentPageTitle = objectData?.name
        ? `Редактирование ${formatObjectName(objectData.name)}`
        : 'Добавление объекта'

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
                        link: '/objects',
                        text: t('menu.objects', 'Объекты')
                    }
                ]}
            />

            <AstroObjectForm
                disabled={objectLoading || createLoading || updateLoading || createSuccess || updateSuccess}
                initialData={objectData}
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
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.OBJECTS_MANAGE, '/objects')

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

export default ObjectFormPage
