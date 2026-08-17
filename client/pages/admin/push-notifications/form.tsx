import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Button, Container, Dialog, Input, Message, Select, TextArea } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, HOST_IMG, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

const PushNotificationFormPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id?: string }

    const { data: pushData, isLoading: pushLoading } = API.usePushNotificationGetItemQuery(id!, {
        skip: !id
    })

    const { data: audiencesData, isLoading: audiencesLoading } = API.usePushNotificationGetAudiencesQuery()

    const [createPushNotification, { isLoading: createLoading, isSuccess: createSuccess, error: createError }] =
        API.usePushNotificationCreateMutation()

    const [updatePushNotification, { isLoading: updateLoading, isSuccess: updateSuccess, error: updateError }] =
        API.usePushNotificationUpdateMutation()

    const [uploadIcon, { isLoading: uploadLoading }] = API.usePushNotificationUploadIconMutation()

    const [testSend, { isLoading: testLoading, isSuccess: testSuccess, error: testError }] =
        API.usePushNotificationTestSendMutation()

    const [launchPushNotification, { isLoading: launchLoading, error: launchError }] =
        API.usePushNotificationLaunchMutation()

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [url, setUrl] = useState('')
    const [audienceValue, setAudienceValue] = useState<string>('all')
    const [iconUrl, setIconUrl] = useState<string | undefined>()
    const [showConfirm, setShowConfirm] = useState(false)
    const [savedId, setSavedId] = useState<string | undefined>(id)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (pushData) {
            setTitle(pushData.title)
            setBody(pushData.body)
            setUrl(pushData.url ?? '')
            setIconUrl(pushData.icon ? `${HOST_IMG}${pushData.icon}` : undefined)

            if (pushData.audienceType === 'event' && pushData.audienceEventId) {
                setAudienceValue(`event_${pushData.audienceEventId}`)
            } else {
                setAudienceValue('all')
            }
        }
    }, [pushData])

    const isValid = title.trim() !== '' && body.trim() !== ''

    const parseAudienceValue = (value: string) => {
        if (value.startsWith('event_')) {
            return { audienceEventId: value.slice('event_'.length), audienceType: 'event' as const }
        }
        return { audienceEventId: null, audienceType: 'all' as const }
    }

    const handleSaveDraft = async () => {
        const audience = parseAudienceValue(audienceValue)
        const trimmedUrl = url.trim() || undefined

        if (savedId ?? id) {
            await updatePushNotification({ body, id: (savedId ?? id)!, title, url: trimmedUrl, ...audience })
        } else {
            const result = await createPushNotification({ body, title, url: trimmedUrl, ...audience })

            if ('data' in result && result.data) {
                setSavedId(result.data.id)
            }
        }
    }

    const handleIconChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const currentId = savedId ?? id

        if (!file || !currentId) {
            return
        }

        const formData = new FormData()
        formData.append('image', file)

        const result = await uploadIcon({ formData, id: currentId })

        if ('data' in result && result.data) {
            setIconUrl(`${HOST_IMG}${result.data.icon}`)
        }
    }

    const handleTestSend = async () => {
        const currentId = savedId ?? id

        if (!currentId) {
            return
        }

        await testSend(currentId)
    }

    const handleLaunchConfirm = async () => {
        const currentId = savedId ?? id

        if (!currentId) {
            return
        }

        setShowConfirm(false)

        const result = await launchPushNotification(currentId)

        if ('error' in result) {
            // Stay on the page instead of redirecting - a failed launch must
            // never look like it succeeded. The error Message below (driven
            // by `launchError`) surfaces what actually went wrong.
            return
        }

        await router.push('/admin/push-notifications')
    }

    const isEditing = Boolean(id)
    const pageTitle = isEditing
        ? t('pages.push-notifications.edit-campaign', 'Редактировать уведомление')
        : t('pages.push-notifications.create', 'Новое уведомление')
    const isBusy = pushLoading || createLoading || updateLoading || launchLoading
    const isDraft = !pushData || pushData.status === 'draft'

    const saveError = createError ?? updateError

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
                links={[
                    { link: '/admin/push-notifications', text: t('pages.push-notifications.title', 'Push-уведомления') }
                ]}
            />

            <Container className={styles.formContainer}>
                {(saveError || createSuccess || updateSuccess) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={saveError ? 'error' : 'success'}
                    >
                        {saveError
                            ? t('pages.push-notifications.save-error', 'Ошибка сохранения')
                            : t('pages.push-notifications.save-success', 'Сохранено')}
                    </Message>
                )}

                {(testError || testSuccess) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={testError ? 'error' : 'success'}
                    >
                        {testSuccess
                            ? t('pages.push-notifications.test-send-success', 'Тестовое уведомление отправлено')
                            : t('pages.push-notifications.test-send-error', 'Ошибка отправки теста')}
                    </Message>
                )}

                {launchError && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={'error'}
                    >
                        {getErrorMessage(launchError) ??
                            t('pages.push-notifications.launch-error', 'Не удалось запустить рассылку')}
                    </Message>
                )}

                <Select<string>
                    className={styles.formGroup}
                    label={t('pages.push-notifications.field-audience', 'Аудитория')}
                    placeholder={t('pages.push-notifications.field-audience', 'Аудитория')}
                    loading={audiencesLoading}
                    disabled={!isDraft || isBusy}
                    value={audienceValue}
                    options={audiencesData?.items?.map((item) => ({
                        key: item.type === 'event' && item.eventId ? `event_${item.eventId}` : 'all',
                        value: `${item.labelRu} (${item.count})`
                    }))}
                    onSelect={(values) => {
                        if (values?.[0]?.key !== undefined) {
                            setAudienceValue(values[0].key)
                        }
                    }}
                />

                <Input
                    size={'medium'}
                    className={styles.formGroup}
                    label={t('pages.push-notifications.field-title', 'Заголовок уведомления')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isBusy}
                />

                <TextArea
                    size={'medium'}
                    autoResize={true}
                    className={styles.formGroup}
                    label={t('pages.push-notifications.field-body', 'Текст уведомления')}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={isBusy}
                />

                <Input
                    size={'medium'}
                    className={styles.formGroup}
                    label={t('pages.push-notifications.field-url', 'Ссылка при клике')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isBusy}
                />

                <div className={styles.formGroup}>
                    <label>{t('pages.push-notifications.field-icon', 'Иконка уведомления')}</label>
                    <input
                        ref={fileInputRef}
                        type={'file'}
                        accept={'image/*'}
                        onChange={handleIconChange}
                        disabled={uploadLoading || isBusy || !(savedId ?? id)}
                        style={{ marginTop: '4px' }}
                    />
                    {uploadLoading && <span>{t('pages.push-notifications.uploading', 'Загрузка...')}</span>}
                    {iconUrl && (
                        <div className={styles.imagePreview}>
                            {/* eslint-disable-next-line next/no-img-element */}
                            <img
                                src={iconUrl}
                                alt={t('pages.push-notifications.image-preview-alt', 'Предпросмотр')}
                            />
                        </div>
                    )}
                    {!(savedId ?? id) && (
                        <small style={{ color: '#888' }}>
                            {t(
                                'pages.push-notifications.save-first-hint',
                                'Сначала сохраните черновик для загрузки иконки'
                            )}
                        </small>
                    )}
                </div>

                <div className={styles.formActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.push-notifications.save-draft', 'Сохранить черновик')}
                        onClick={handleSaveDraft}
                        disabled={isBusy || title.trim() === ''}
                        loading={createLoading || updateLoading}
                    />

                    <Button
                        mode={'secondary'}
                        label={t('pages.push-notifications.test-send', 'Отправить тест')}
                        onClick={handleTestSend}
                        disabled={isBusy || testLoading || !(savedId ?? id)}
                        loading={testLoading}
                    />

                    <Button
                        mode={'primary'}
                        label={t('pages.push-notifications.launch', 'Запустить рассылку')}
                        onClick={() => setShowConfirm(true)}
                        disabled={!isValid || isBusy || !(savedId ?? id)}
                    />
                </div>
            </Container>

            <Dialog
                title={t('pages.push-notifications.launch', 'Запустить рассылку')}
                open={showConfirm}
                showOverlay={true}
                showCloseButton={true}
                onCloseDialog={() => setShowConfirm(false)}
            >
                <p>
                    {t(
                        'pages.push-notifications.launch-confirm',
                        'Вы уверены? Push-уведомления будут отправлены подписчикам.'
                    )}
                </p>
                <div className={styles.modalActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.push-notifications.cancel', 'Отмена')}
                        onClick={() => setShowConfirm(false)}
                    />
                    <Button
                        mode={'primary'}
                        label={t('pages.push-notifications.launch', 'Запустить рассылку')}
                        onClick={handleLaunchConfirm}
                        loading={launchLoading}
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
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.PUSH_MANAGE)

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

export default PushNotificationFormPage
