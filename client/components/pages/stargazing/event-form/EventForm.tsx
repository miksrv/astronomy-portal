import React, { useEffect, useState } from 'react'
import { Button, Container, Input, TextArea } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'

import styles from './styles.module.sass'

export type EventFormType = Partial<
    Omit<ApiModel.Event, 'date' | 'availableTickets' | 'registrationStart' | 'registrationEnd'>
> & {
    date?: string
    registrationStart?: string
    registrationEnd?: string
    tickets?: string
    upload?: File
}

interface EventFormProps {
    disabled?: boolean
    initialData?: ApiModel.Event
    onSubmit?: (formData?: EventFormType) => void
    onCancel?: () => void
}

export const EventForm: React.FC<EventFormProps> = ({ disabled, initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<EventFormType>({})

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, upload: e?.target?.files?.[0] })
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

            <TextArea
                size={'large'}
                disabled={disabled}
                className={styles.formElement}
                label={'Описание'}
                autoResize={true}
                value={formData.content}
                style={{ width: '100%' }}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />

            <div className={styles.imageSection}>
                {!!initialData?.coverFileName && !!initialData?.coverFileExt && (
                    <Image
                        className={styles.image}
                        src={`${hosts.stargazing}${initialData.id}/cover.${initialData.coverFileExt}`}
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
