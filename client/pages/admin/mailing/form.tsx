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

const MailingFormPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id?: string }

    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')

    const {
        audiencesData,
        audiencesLoading,
        audienceValue,
        setAudienceValue,
        mediaUrl: imageUrl,
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
        handleFileChange: handleImageChange,
        handleTestSend,
        handleLaunchConfirm
    } = useCampaignForm<
        ApiModel.Mailing,
        ApiModel.CreateMailingRequest,
        ApiModel.UpdateMailingRequest,
        ApiType.Mailings.ResMailingUpload
    >({
        id,
        redirectPath: '/admin/mailing',
        useGetItemQuery: API.useMailingGetItemQuery,
        useGetAudiencesQuery: API.useMailingGetAudiencesQuery,
        useCreateMutation: API.useMailingCreateMutation,
        useUpdateMutation: API.useMailingUpdateMutation,
        useUploadMutation: API.useMailingUploadImageMutation,
        useTestSendMutation: API.useMailingTestSendMutation,
        useLaunchMutation: API.useMailingLaunchMutation,
        onItemLoaded: (item) => {
            setSubject(item.subject)
            setContent(item.content)
        },
        uploadFieldName: 'upload',
        getMediaUrl: (item) => (item.image ? `${HOST_IMG}${item.image}` : undefined),
        getUploadedUrl: (data) => `${HOST_IMG}${data.image}`,
        buildCreatePayload: (audience) => ({ content, subject, ...audience }),
        buildUpdatePayload: (audience) => ({ content, subject, ...audience })
    })

    const isValid = subject.trim() !== '' && content.trim() !== ''

    const isEditing = Boolean(id)
    const pageTitle = isEditing
        ? t('pages.mailing.edit-campaign', 'Редактировать рассылку')
        : t('pages.mailing.create', 'Новая рассылка')

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
                links={[{ link: '/admin/mailing', text: t('pages.mailing.title', 'Рассылки') }]}
            />

            <Container className={styles.formContainer}>
                {(saveError || createSuccess || updateSuccess) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={saveError ? 'error' : 'success'}
                    >
                        {saveError
                            ? t('pages.mailing.save-error', 'Ошибка сохранения')
                            : t('pages.mailing.save-success', 'Сохранено')}
                    </Message>
                )}

                {(testError || testSuccess) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={testError ? 'error' : 'success'}
                    >
                        {testSuccess
                            ? t('pages.mailing.test-send-success', 'Тестовое письмо отправлено')
                            : t('pages.mailing.test-send-error', 'Ошибка отправки теста')}
                    </Message>
                )}

                {Boolean(launchError) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={'error'}
                    >
                        {getErrorMessage(launchError) ??
                            t('pages.mailing.launch-error', 'Не удалось запустить рассылку')}
                    </Message>
                )}

                <Select<string>
                    className={styles.formGroup}
                    label={t('pages.mailing.field-audience', 'Аудитория')}
                    placeholder={t('pages.mailing.field-audience', 'Аудитория')}
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
                    label={t('pages.mailing.field-subject', 'Тема письма')}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isBusy}
                />

                <TextArea
                    size={'medium'}
                    autoResize={true}
                    className={styles.formGroup}
                    label={t('pages.mailing.field-content', 'Содержимое письма')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isBusy}
                />

                <div className={styles.formGroup}>
                    <label>{t('pages.mailing.field-attachment', 'Прикрепить изображение')}</label>
                    <input
                        type={'file'}
                        accept={'image/*'}
                        onChange={handleImageChange}
                        disabled={uploadLoading || isBusy || !currentId}
                        style={{ marginTop: '4px' }}
                    />
                    {uploadLoading && <span>{t('pages.mailing.uploading', 'Загрузка...')}</span>}
                    {imageUrl && (
                        <div className={styles.imagePreview}>
                            {/* eslint-disable-next-line next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt={t('pages.mailing.image-preview-alt', 'Предпросмотр')}
                            />
                        </div>
                    )}
                    {!currentId && (
                        <small style={{ color: '#888' }}>
                            {t('pages.mailing.save-first-hint', 'Сначала сохраните черновик для загрузки изображения')}
                        </small>
                    )}
                </div>

                <div className={styles.formActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.mailing.save-draft', 'Сохранить черновик')}
                        onClick={handleSaveDraft}
                        disabled={isBusy || subject.trim() === ''}
                        loading={createLoading || updateLoading}
                    />

                    <Button
                        mode={'secondary'}
                        label={t('pages.mailing.test-send', 'Отправить тест')}
                        onClick={handleTestSend}
                        disabled={isBusy || testLoading || !currentId}
                        loading={testLoading}
                    />

                    <Button
                        mode={'primary'}
                        label={t('pages.mailing.launch', 'Запустить рассылку')}
                        onClick={() => setShowConfirm(true)}
                        disabled={!isValid || isBusy || !currentId}
                    />
                </div>
            </Container>

            <Dialog
                title={t('pages.mailing.launch', 'Запустить рассылку')}
                open={showConfirm}
                showOverlay={true}
                showCloseButton={true}
                onCloseDialog={() => setShowConfirm(false)}
            >
                <p>{t('pages.mailing.launch-confirm', 'Вы уверены? Письма будут отправлены участникам.')}</p>
                <div className={styles.modalActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.mailing.cancel', 'Отмена')}
                        onClick={() => setShowConfirm(false)}
                    />
                    <Button
                        mode={'primary'}
                        label={t('pages.mailing.launch', 'Запустить рассылку')}
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
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.MAILINGS_MANAGE)

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

export default MailingFormPage
