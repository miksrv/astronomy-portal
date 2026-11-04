import React, { useCallback, useEffect, useState } from 'react'
import { Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, useUnsavedChangesGuard } from '@/components/common'
import { AstroObjectForm, AstroObjectFormSkeleton, AstroObjectFormType } from '@/components/pages/objects'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { formatObjectName } from '@/utils/strings'

const ObjectFormPage: NextPage<object> = () => {
    const router = useRouter()

    const id = typeof router.query.id === 'string' ? router.query.id : undefined
    const { t } = useTranslation()

    const [savedName, setSavedName] = useState<string>()
    const [dirty, setDirty] = useState(false)

    const {
        data: objectData,
        isLoading: objectLoading,
        isError: objectError
    } = API.useObjectsGetItemQuery(id as string, {
        skip: !id
    })

    const [createObject, { error: createError, isLoading: createLoading, isSuccess: createSuccess }] =
        API.useObjectsPostMutation()

    const [updateObject, { error: updateError, isLoading: updateLoading, isSuccess: updateSuccess }] =
        API.useObjectsPatchMutation()

    const saved = createSuccess || updateSuccess

    // Leaving with unsaved changes asks first; the redirect after a save doesn't
    const guard = useUnsavedChangesGuard(dirty && !saved)

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

    // Back where the editor came from: the object's page, or the catalog for a new one
    const handleCancel = () => guard.navigate(id ? `/objects/${id}` : '/objects')

    const handleDirtyChange = useCallback((value: boolean) => setDirty(value), [])

    useEffect(() => {
        if (saved && savedName) {
            void router.push(`/objects/${savedName}`)
        }
    }, [saved, savedName])

    const currentPageTitle = id
        ? t('pages.objects-form.edit-title', 'Редактирование {{name}}', { name: formatObjectName(id) })
        : t('pages.objects-form.add-title', 'Добавление объекта')

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
                    },
                    ...(id && objectData ? [{ link: `/objects/${id}`, text: formatObjectName(id) }] : [])
                ]}
            />

            {id && objectError ? (
                <Message
                    type={'error'}
                    title={t('pages.objects-form.not-found-title', 'Объект не найден')}
                >
                    {t(
                        'pages.objects-form.not-found',
                        'Объекта {{name}} нет в каталоге — возможно, он удалён или в ссылке ошибка.',
                        { name: formatObjectName(id) }
                    )}{' '}
                    <Link href={'/objects'}>{t('pages.objects-form.back-to-catalog', 'Вернуться к объектам')}</Link>
                </Message>
            ) : id && objectLoading ? (
                <AstroObjectFormSkeleton />
            ) : (
                <AstroObjectForm
                    disabled={createLoading || updateLoading || saved}
                    initialData={objectData}
                    error={createError || updateError}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    onDirtyChange={handleDirtyChange}
                />
            )}

            {guard.dialog}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.OBJECTS_MANAGE, '/objects', [
                'translation',
                'objects',
                'starmap'
            ])

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
