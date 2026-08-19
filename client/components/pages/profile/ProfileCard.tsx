import React, { useEffect, useRef, useState } from 'react'
import { Button, Container, Input, Message, Select } from 'simple-react-ui-kit'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, HOST_IMG } from '@/api'
import { PhoneInput } from '@/components/common/phone-input'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useApiFormError } from '@/hooks/useApiFormError'
import useLocalStorage from '@/hooks/useLocalStorage'
import { LOCAL_STORAGE } from '@/utils/constants'

import styles from './styles.module.sass'

interface ProfileCardProps {
    user?: ApiModel.User
    isOnboarding?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, isOnboarding }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const [returnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const [name, setName] = useState<string>(user?.name ?? '')
    const [phone, setPhone] = useState<string>(user?.phone ?? '')
    const [birthday, setBirthday] = useState<string>(user?.birthday ?? '')
    const [sex, setSex] = useState<'m' | 'f' | undefined>(user?.sex)
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
    const [submitError, setSubmitError] = useState<unknown>(undefined)

    const [updateProfile, { isLoading }] = API.useAuthUpdateProfileMutation()

    const { message: apiErrorMessage, fieldErrors } = useApiFormError(submitError)

    // `user` is still undefined on the very first render (it's populated a tick
    // later by useAuthSession's login() dispatch), so the useState initializers
    // above capture empty defaults. Re-sync the fields once real user data
    // shows up, but only the first time for a given user — otherwise a
    // background refetch of `authGetMe` would stomp on an in-progress edit.
    const syncedUserId = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (user && syncedUserId.current !== user.id) {
            setName(user.name ?? '')
            setPhone(user.phone ?? '')
            setBirthday(user.birthday ?? '')
            setSex(user.sex)
            syncedUserId.current = user.id
        }
    }, [user])

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

    const handleSave = async () => {
        setSaveSuccess(false)
        setSubmitError(undefined)

        try {
            await updateProfile({
                name,
                phone: phone || undefined,
                birthday: birthday || undefined,
                sex
            }).unwrap()

            if (isOnboarding) {
                goToReturnPath()
                return
            }

            setSaveSuccess(true)
        } catch (err) {
            setSubmitError(err)
        }
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

                <div className={styles.fieldsSection}>
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
                            <Input
                                label={t('pages.profile.field-name', 'Имя')}
                                value={name}
                                error={fieldErrors['name']}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    setSaveSuccess(false)
                                }}
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

                        <PhoneInput
                            label={t('pages.profile.field-phone', 'Телефон')}
                            value={phone}
                            error={fieldErrors['phone']}
                            onChange={(e) => {
                                setPhone(e.target.value)
                                setSaveSuccess(false)
                            }}
                        />

                        <Input
                            type={'date'}
                            label={t('pages.profile.field-birthday', 'Дата рождения')}
                            value={birthday}
                            error={fieldErrors['birthday']}
                            onChange={(e) => {
                                setBirthday(e.target.value)
                                setSaveSuccess(false)
                            }}
                        />

                        <Select
                            label={t('pages.profile.field-sex', 'Пол')}
                            options={sexOptions}
                            value={sex}
                            clearable={true}
                            error={fieldErrors['sex']}
                            onSelect={(selected) => {
                                setSex(selected?.[0]?.key)
                                setSaveSuccess(false)
                            }}
                        />
                    </div>

                    <div className={styles.actionsRow}>
                        <Button
                            mode={'primary'}
                            size={'medium'}
                            stretched={true}
                            loading={isLoading}
                            disabled={isLoading}
                            onClick={handleSave}
                        >
                            {t('pages.profile.save', 'Сохранить')}
                        </Button>

                        {isOnboarding && (
                            <Button
                                mode={'outline'}
                                size={'medium'}
                                disabled={isLoading}
                                onClick={goToReturnPath}
                            >
                                {t('pages.profile.onboarding-skip', 'Пропустить')}
                            </Button>
                        )}
                    </div>

                    {saveSuccess && (
                        <Message type={'success'}>{t('pages.profile.save-success', 'Профиль обновлён')}</Message>
                    )}

                    {!!submitError && (
                        <Message type={'error'}>
                            {apiErrorMessage || t('pages.profile.save-error', 'Не удалось сохранить профиль')}
                        </Message>
                    )}
                </div>
            </div>
        </Container>
    )
}
