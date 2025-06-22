import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button, Container, Input } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

import { ApiModel } from '@/api'
import { createLargePhotoUrl } from '@/tools/photos'

export type AstroStargazingFormType = Partial<
    Omit<ApiModel.Event, 'date' | 'availableTickets' | 'registrationStart' | 'registrationEnd'>
> & {
    date?: string
    registrationStart?: string
    registrationEnd?: string
    tickets?: string
    upload?: File
}

interface AstroStargazingFormProps {
    disabled?: boolean
    initialData?: ApiModel.Event
    onSubmit?: (formData?: AstroStargazingFormType) => void
    onCancel?: () => void
}

const AstroStargazingForm: React.FC<AstroStargazingFormProps> = ({ disabled, initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<AstroStargazingFormType>({})

    const handleImageUpload = (e: any) => {
        setFormData({ ...formData, upload: e.target.files[0] })
    }

    const handleSubmit = () => {
        onSubmit?.(formData)
    }

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: initialData?.date?.date,
                registrationStart: initialData?.registrationStart?.date,
                registrationEnd: initialData?.registrationEnd?.date,
                tickets: initialData?.availableTickets?.toString()
            })
        }
    }, [initialData])

    return (
        <Container>
            <Input
                size={'large'}
                required={true}
                disabled={disabled}
                className={styles.formElement}
                type={'input'}
                label={'Заголовок'}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <div className={styles.sections}>
                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'number'}
                    label={'Количество доступных мест'}
                    value={formData.tickets}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            tickets: e.target.value
                        })
                    }
                />

                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'datetime-local'}
                    label={'Дата проведения (по Оренбургскому времени)'}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
            </div>

            <div className={styles.sections}>
                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'datetime-local'}
                    label={'Дата начала регистрации'}
                    value={formData.registrationStart}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            registrationStart: e.target.value
                        })
                    }
                />

                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'datetime-local'}
                    label={'Дата завершения регистрации'}
                    value={formData.registrationEnd}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            registrationEnd: e.target.value
                        })
                    }
                />
            </div>

            <div className={styles.sections}>
                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'input'}
                    label={'Ссылка на карту Google'}
                    value={formData.googleMap}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            googleMap: e.target.value
                        })
                    }
                />

                <Input
                    size={'large'}
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'input'}
                    label={'Ссылка на карту Yandex'}
                    value={formData.yandexMap}
                    onChange={(e) => setFormData({ ...formData, yandexMap: e.target.value })}
                />
            </div>

            <textarea
                disabled={disabled}
                className={styles.formElement}
                placeholder={'Описание'}
                value={formData.content}
                style={{ width: '100%' }}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />

            <div className={styles.imageSection}>
                {!!initialData?.coverFileName && (
                    <Image
                        className={styles.image}
                        src={createLargePhotoUrl(initialData as ApiModel.Photo)}
                        fill={true}
                        alt={''}
                    />
                )}
            </div>
            <div style={{ marginTop: 15 }}>
                <label>{initialData?.coverFileName ? 'Заменить обложку:' : 'Загрузить обложку:'}</label>
                <input
                    disabled={disabled}
                    onChange={handleImageUpload}
                    type={'file'}
                    accept={'image/png, image/gif, image/jpeg'}
                />
            </div>

            <div className={styles.footer}>
                <Button
                    mode={'secondary'}
                    label={'Отмена'}
                    disabled={disabled}
                    onClick={onCancel}
                />

                <Button
                    mode={'primary'}
                    variant={'positive'}
                    label={'Сохранить'}
                    disabled={disabled}
                    onClick={handleSubmit}
                />
            </div>
        </Container>
    )
}

export default AstroStargazingForm
