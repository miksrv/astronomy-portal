import React, { useState } from 'react'
import { Button, Container, Dialog, Input, Message, Select, TextArea } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType, HOST_IMG, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { useCampaignForm } from '@/hooks/useCampaignForm'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

const PushNotificationFormPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id?: string }

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [url, setUrl] = useState('')

    const {
        audiencesData,
        audiencesLoading,
        audienceValue,
        setAudienceValue,
        mediaUrl: iconUrl,
        showConfirm,
        setShowConfirm,
        currentId,
        isDraft,
        isBusy,
        createLoading,
        updateLoading,
        createSuccess,
        updateSuccess,
        saveError,
        uploadLoading,
        testLoading,
        testSuccess,
        testError,
        launchLoading,
        launchError,
        handleSaveDraft,
        handleFileChange: handleIconChange,
        handleTestSend,
        handleLaunchConfirm
    } = useCampaignForm<
        ApiModel.PushNotification,
        ApiModel.CreatePushNotificationRequest,
        ApiModel.UpdatePushNotificationRequest,
        ApiType.Push.ResPushUpload
    >({
        id,
        redirectPath: '/admin/push-notifications',
        useGetItemQuery: API.usePushNotificationGetItemQuery,
        useGetAudiencesQuery: API.usePushNotificationGetAudiencesQuery,
        useCreateMutation: API.usePushNotificationCreateMutation,
        useUpdateMutation: API.usePushNotificationUpdateMutation,
        useUploadMutation: API.usePushNotificationUploadIconMutation,
        useTestSendMutation: API.usePushNotificationTestSendMutation,
        useLaunchMutation: API.usePushNotificationLaunchMutation,
        onItemLoaded: (item) => {
            setTitle(item.title)
            setBody(item.body)
            setUrl(item.url ?? '')
        },
        uploadFieldName: 'image',
        getMediaUrl: (item) => (item.icon ? `${HOST_IMG}${item.icon}` : undefined),
        getUploadedUrl: (data) => `${HOST_IMG}${data.icon}`,
        buildCreatePayload: (audience) => ({ body, title, url: url.trim() || undefined, ...audience }),
        buildUpdatePayload: (audience) => ({ body, title, url: url.trim() || undefined, ...audience })
    })

    const isValid = title.trim() !== '' && body.trim() !== ''

    const isEditing = Boolean(id)
    const pageTitle = isEditing
        ? t('pages.push-notifications.edit-campaign', 'Редактировать уведомление')
        : t('pages.push-notifications.create', 'Новое уведомление')

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

                {Boolean(launchError) && (
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
                        type={'file'}
                        accept={'image/*'}
                        onChange={handleIconChange}
                        disabled={uploadLoading || isBusy || !currentId}
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
                    {!currentId && (
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
                        disabled={isBusy || testLoading || !currentId}
                        loading={testLoading}
                    />

                    <Button
                        mode={'primary'}
                        label={t('pages.push-notifications.launch', 'Запустить рассылку')}
                        onClick={() => setShowConfirm(true)}
                        disabled={!isValid || isBusy || !currentId}
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
