import React, { useEffect, useState } from 'react'
import { Button, Container, Input, TextArea } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel, ApiType } from '@/api'
import { hosts } from '@/api/constants'

import styles from './styles.module.sass'

type EventFormType = ApiType.Events.EventFormType

interface EventFormProps {
    disabled?: boolean
    initialData?: ApiModel.Event
    onSubmit?: (formData?: EventFormType) => void
    onCancel?: () => void
}

export const EventForm: React.FC<EventFormProps> = ({ disabled, initialData, onSubmit, onCancel }) => {
    // Prefill sensible defaults for a brand-new event. In edit mode the effect
    // below overwrites these with the existing event's values.
    const [formData, setFormData] = useState<EventFormType>({
        ticketPrice: '500',
        yandexMap: 'https://yandex.com/maps/-/CDvPzZkD',
        googleMap: 'https://maps.app.goo.gl/MWEcbhNK6wj2eeEPA'
    })

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
                tickets: initialData?.availableTickets?.toString(),
                ticketPrice: initialData?.ticketPrice?.toString()
            })
        }
    }, [initialData])

    return (
        <Container>
            <Input
                required={true}
                disabled={disabled}
                className={styles.formElement}
                type={'input'}
                label={'Заголовок'}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <div className={styles.sections}>
                <div className={styles.fieldWithHint}>
                    <Input
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
                    <small className={styles.hint}>Считается только по взрослым</small>
                </div>

                <div className={styles.fieldWithHint}>
                    <Input
                        disabled={disabled}
                        className={styles.formElement}
                        type={'number'}
                        label={'Цена билета за взрослого, ₽'}
                        value={formData.ticketPrice}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                ticketPrice: e.target.value
                            })
                        }
                    />
                    <small className={styles.hint}>0 — бесплатно, дети до 18 лет бесплатно</small>
                </div>

                <div className={styles.fieldWithHint}>
                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        type={'datetime-local'}
                        label={'Дата и время проведения'}
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                    <small className={styles.hint}>по Оренбургскому времени</small>
                </div>
            </div>

            <div className={styles.sections}>
                <Input
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
