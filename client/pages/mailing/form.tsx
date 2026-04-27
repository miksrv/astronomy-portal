import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Dialog, Input, Message, TextArea } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, HOST_IMG, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

import styles from './styles.module.sass'

const MailingFormPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id?: string }

    const { data: mailingData, isLoading: mailingLoading } = API.useMailingGetItemQuery(id!, {
        skip: !id
    })

    const [createMailing, { isLoading: createLoading, isSuccess: createSuccess, error: createError }] =
        API.useMailingCreateMutation()

    const [updateMailing, { isLoading: updateLoading, isSuccess: updateSuccess, error: updateError }] =
        API.useMailingUpdateMutation()

    const [uploadImage, { isLoading: uploadLoading }] = API.useMailingUploadImageMutation()

    const [testSend, { isLoading: testLoading, isSuccess: testSuccess, error: testError }] =
        API.useMailingTestSendMutation()

    const [launchMailing, { isLoading: launchLoading }] = API.useMailingLaunchMutation()

    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [imageUrl, setImageUrl] = useState<string | undefined>()
    const [showConfirm, setShowConfirm] = useState(false)
    const [savedId, setSavedId] = useState<string | undefined>(id)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (mailingData) {
            setSubject(mailingData.subject)
            setContent(mailingData.content)
            setImageUrl(mailingData.image ? `${HOST_IMG}${mailingData.image}` : undefined)
        }
    }, [mailingData])

    const isValid = subject.trim() !== '' && content.trim() !== ''

    const handleSaveDraft = async () => {
        if (savedId ?? id) {
            await updateMailing({ content, id: (savedId ?? id)!, subject })
        } else {
            const result = await createMailing({ content, subject })

            if ('data' in result && result.data) {
                setSavedId(result.data.id)
            }
        }
    }

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const currentId = savedId ?? id

        if (!file || !currentId) {
            return
        }

        const formData = new FormData()
        formData.append('upload', file)

        const result = await uploadImage({ formData, id: currentId })

        if ('data' in result && result.data) {
            setImageUrl(`${HOST_IMG}${result.data.image}`)
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
        await launchMailing(currentId)
        await router.push('/mailing')
    }

    const isEditing = Boolean(id)
    const pageTitle = isEditing
        ? t('pages.mailing.edit-campaign', 'Редактировать рассылку')
        : t('pages.mailing.create', 'Новая рассылка')
    const isBusy = mailingLoading || createLoading || updateLoading || launchLoading

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
                links={[{ link: '/mailing', text: t('pages.mailing.title', 'Рассылки') }]}
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
                        ref={fileInputRef}
                        type={'file'}
                        accept={'image/*'}
                        onChange={handleImageChange}
                        disabled={uploadLoading || isBusy || !(savedId ?? id)}
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
                    {!(savedId ?? id) && (
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
                        disabled={isBusy || testLoading || !(savedId ?? id)}
                        loading={testLoading}
                    />

                    <Button
                        mode={'primary'}
                        label={t('pages.mailing.launch', 'Запустить рассылку')}
                        onClick={() => setShowConfirm(true)}
                        disabled={!isValid || isBusy || !(savedId ?? id)}
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
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default MailingFormPage
