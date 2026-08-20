import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, FieldErrors, useForm } from 'react-hook-form'
import dayjs from 'dayjs'
import { Button, Container, Input, Message, Select } from 'simple-react-ui-kit'
import { zodResolver } from '@hookform/resolvers/zod'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, HOST_IMG } from '@/api'
import { PhoneInput } from '@/components/common/phone-input'
import { DateTimeInput } from '@/components/ui/date-time-input'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useApiFormError } from '@/hooks/useApiFormError'
import useLocalStorage from '@/hooks/useLocalStorage'
import useScrollToApiFieldErrors from '@/hooks/useScrollToApiFieldErrors'
import useSnackbar from '@/hooks/useSnackbar'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import { LOCAL_STORAGE } from '@/utils/constants'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { flattenFieldErrorPaths, scrollToFirstFieldError } from '@/utils/formErrorScroll'

import { buildProfileSchema, ProfileFormValues } from './schema'

import styles from './styles.module.sass'

interface ProfileCardProps {
    user?: ApiModel.User
    isOnboarding?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, isOnboarding }) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const [returnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)
    const snackbar = useSnackbar()

    const [submitError, setSubmitError] = useState<unknown>(undefined)

    const [updateProfile, { isLoading }] = API.useAuthUpdateProfileMutation()

    const { fieldErrors } = useApiFormError(submitError)

    const profileSchema = useMemo(() => buildProfileSchema(t), [t])

    const {
        control,
        handleSubmit,
        reset,
        setError,
        // Deliberately left at the RHF default (validate on submit, then
        // re-validate a field live once it has an error) rather than
        // `mode: 'onChange'` - with four independent fields, `onChange` mode
        // would let an untouched invalid field (e.g. a name cleared by a
        // background `authGetMe` refetch racing the user) silently disable
        // the submit button without ever surfacing an error for it. See
        // ReviewForm for the same reasoning.
        formState: { isSubmitting }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: '', phone: '', birthday: '', sex: undefined }
    })

    useSyncApiFieldErrors(fieldErrors, setError)
    useScrollToApiFieldErrors(fieldErrors)

    // `user` is still undefined on the very first render (it's populated a tick
    // later by useAuthSession's login() dispatch), so the `defaultValues` above
    // capture empty defaults. Re-sync the fields once real user data shows up,
    // but only the first time for a given user - otherwise a background
    // refetch of `authGetMe` would stomp on an in-progress edit.
    const syncedUserId = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (user && syncedUserId.current !== user.id) {
            reset({
                name: user.name ?? '',
                phone: user.phone ?? '',
                birthday: user.birthday ?? '',
                sex: user.sex
            })
            syncedUserId.current = user.id
        }
    }, [user, reset])

    if (!user) {
        return null
    }

    const avatarSrc = user.avatar ? `${HOST_IMG}/users/${user.id}/${user.avatar}` : undefined

    const sexOptions = [
        { key: 'm' as const, value: t('pages.profile.field-sex-male', 'Мужской') },
        { key: 'f' as const, value: t('pages.profile.field-sex-female', 'Женский') }
    ]

    const goToReturnPath = () => {
        const isValidPath = typeof returnPath === 'string' && returnPath.startsWith('/') && !returnPath.includes('://')

        void router.push(isValidPath ? returnPath : '/profile')
    }

    const onValid = async (values: ProfileFormValues) => {
        setSubmitError(undefined)

        try {
            await updateProfile({
                name: values.name,
                phone: values.phone || undefined,
                birthday: values.birthday || undefined,
                sex: values.sex
            }).unwrap()

            if (isOnboarding) {
                goToReturnPath()
                return
            }

            snackbar.push(t('pages.profile.save-success', 'Профиль обновлён'), { type: 'success' })
        } catch (err) {
            setSubmitError(err)

            // A field-tied error is already surfaced inline (see
            // useSyncApiFieldErrors below) plus a scroll to it - a toast on
            // top would just be noise. Only a message with no specific field
            // needs its own, since there's nothing to scroll to.
            if (Object.keys(getFieldErrors(err)).length === 0) {
                snackbar.push(getErrorMessage(err) ?? t('pages.profile.save-error', 'Не удалось сохранить профиль'), {
                    type: 'error'
                })
            }
        }
    }

    // Fires when a submit attempt fails client-side (zod) validation - with
    // no mutation ever called, this is the only signal the user gets, so it
    // has to do more than the inline field message on its own can (see
    // `scrollToFirstFieldError`).
    const onInvalid = (formErrors: FieldErrors<ProfileFormValues>) => {
        scrollToFirstFieldError(flattenFieldErrorPaths(formErrors))
    }

    return (
        <Container>
            <div className={styles.profileCard}>
                <div className={styles.avatarSection}>
                    <UserAvatar
                        size={'large'}
                        src={avatarSrc}
                        name={user.name}
                    />
                    <p className={styles.avatarNote}>
                        {t('pages.profile.avatar-note', 'Аватар привязан к сервису авторизации')}
                    </p>
                </div>

                <form
                    className={styles.fieldsSection}
                    onSubmit={handleSubmit(onValid, onInvalid)}
                    noValidate={true}
                >
                    {isOnboarding && (
                        <Message type={'info'}>
                            {t(
                                'pages.profile.onboarding-intro',
                                'Добро пожаловать! Заполните профиль — это не обязательно, можно сделать позже.'
                            )}
                        </Message>
                    )}

                    <div className={styles.fieldsGrid}>
                        <div>
                            <Controller
                                name={'name'}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Input
                                        {...field}
                                        label={t('pages.profile.field-name', 'Имя')}
                                        error={fieldState.error?.message}
                                        disabled={isLoading || isSubmitting}
                                    />
                                )}
                            />
                            <p className={styles.fieldNote}>
                                {t('pages.profile.name-note', 'Указывайте только реальные данные')}
                            </p>
                        </div>

                        <div>
                            <Input
                                label={t('pages.profile.field-email', 'Email')}
                                value={user.email}
                                disabled={true}
                            />
                            <p className={styles.fieldNote}>
                                {t('pages.profile.email-note', 'Email не может быть изменён')}
                            </p>
                        </div>

                        <Controller
                            name={'phone'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <PhoneInput
                                    {...field}
                                    label={t('pages.profile.field-phone', 'Телефон')}
                                    error={fieldState.error?.message}
                                    disabled={isLoading || isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            name={'birthday'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <DateTimeInput
                                    mode={'date'}
                                    label={t('pages.profile.field-birthday', 'Дата рождения')}
                                    placeholder={t('pages.profile.birthday-placeholder', 'Выберите дату')}
                                    value={field.value}
                                    locale={i18n.language === 'en' ? 'en' : 'ru'}
                                    maxDate={dayjs().format('YYYY-MM-DD')}
                                    error={fieldState.error?.message}
                                    disabled={isLoading || isSubmitting}
                                    testId={'birthday'}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        <Controller
                            name={'sex'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Select
                                    data-testid={'sex'}
                                    label={t('pages.profile.field-sex', 'Пол')}
                                    options={sexOptions}
                                    value={field.value}
                                    clearable={true}
                                    disabled={isLoading || isSubmitting}
                                    error={fieldState.error?.message}
                                    onSelect={(selected) => field.onChange(selected?.[0]?.key)}
                                />
                            )}
                        />
                    </div>

                    <div className={styles.actionsRow}>
                        <Button
                            type={'submit'}
                            mode={'primary'}
                            size={'medium'}
                            stretched={true}
                            loading={isLoading || isSubmitting}
                            disabled={isLoading || isSubmitting}
                        >
                            {t('pages.profile.save', 'Сохранить')}
                        </Button>

                        {isOnboarding && (
                            <Button
                                type={'button'}
                                mode={'outline'}
                                size={'medium'}
                                disabled={isLoading || isSubmitting}
                                onClick={goToReturnPath}
                            >
                                {t('pages.profile.onboarding-skip', 'Пропустить')}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Container>
    )
}
