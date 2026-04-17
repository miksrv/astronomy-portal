import React, { useState } from 'react'
import { Button, Container, Input, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { API, ApiModel, HOST_IMG } from '@/api'
import { UserAvatar } from '@/components/ui/user-avatar'

import styles from './styles.module.sass'

interface ProfileCardProps {
    user: ApiModel.User
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
    const { t } = useTranslation()

    const [name, setName] = useState<string>(user.name)
    const [phone, setPhone] = useState<string>(user.phone ?? '')
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const [updateProfile, { isLoading }] = API.useAuthUpdateProfileMutation()

    const avatarSrc = user.avatar ? `${HOST_IMG}/users/${user.id}/${user.avatar}` : undefined

    const handleSave = async () => {
        setSaveSuccess(false)
        setFieldErrors({})

        try {
            await updateProfile({
                name,
                phone: phone || undefined
            }).unwrap()
            setSaveSuccess(true)
        } catch (err) {
            const messages = (err as { data?: { messages?: Record<string, string> } })?.data?.messages
            if (messages) {
                setFieldErrors(messages)
            }
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
                    <Input
                        label={t('pages.profile.field-name', 'Имя')}
                        value={name}
                        error={fieldErrors['name']}
                        onChange={(e) => {
                            setName(e.target.value)
                            setSaveSuccess(false)
                        }}
                    />

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

                    <Input
                        label={t('pages.profile.field-phone', 'Телефон')}
                        value={phone}
                        error={fieldErrors['phone']}
                        onChange={(e) => {
                            setPhone(e.target.value)
                            setSaveSuccess(false)
                        }}
                    />

                    <Button
                        mode={'primary'}
                        size={'medium'}
                        loading={isLoading}
                        disabled={isLoading}
                        onClick={handleSave}
                    >
                        {t('pages.profile.save', 'Сохранить')}
                    </Button>

                    {saveSuccess && (
                        <Message type={'success'}>{t('pages.profile.save-success', 'Профиль обновлён')}</Message>
                    )}

                    {fieldErrors['general'] && <Message type={'error'}>{fieldErrors['general']}</Message>}
                </div>
            </div>
        </Container>
    )
}
