import React, { useEffect, useState } from 'react'
import { Button, Checkbox, Container, Input, TextArea } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel, ApiType } from '@/api'
import { hosts } from '@/api/constants'
import { DEFAULT_EVENT_COORDINATES, EventMap } from '@/components/common/event-map'
import { toDateTimeLocalValue } from '@/utils/dates'
import { reverseGeocode } from '@/utils/geocoding'

import styles from './styles.module.sass'

type EventFormType = ApiType.Events.EventFormType

interface EventFormProps {
    disabled?: boolean
    initialData?: ApiModel.Event
    onSubmit?: (formData?: EventFormType) => void
    onCancel?: () => void
}

const toCoordinate = (value: string | undefined, fallback: number): number => {
    const parsed = value !== undefined ? parseFloat(value) : NaN

    return Number.isFinite(parsed) ? parsed : fallback
}

export const EventForm: React.FC<EventFormProps> = ({ disabled, initialData, onSubmit, onCancel }) => {
    // Prefill sensible defaults for a brand-new event. In edit mode the effect
    // below overwrites these with the existing event's values.
    const [formData, setFormData] = useState<EventFormType>({
        requiresRegistration: true,
        ticketPrice: '500',
        latitude: String(DEFAULT_EVENT_COORDINATES.latitude),
        longitude: String(DEFAULT_EVENT_COORDINATES.longitude)
    })

    const [isGeocoding, setIsGeocoding] = useState(false)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, upload: e?.target?.files?.[0] })
    }

    const handleSubmit = () => {
        onSubmit?.(formData)
    }

    const handleMapChange = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        setFormData({ ...formData, latitude: latitude.toFixed(7), longitude: longitude.toFixed(7) })
    }

    const handleFindAddress = async () => {
        const latitude = toCoordinate(formData.latitude, DEFAULT_EVENT_COORDINATES.latitude)
        const longitude = toCoordinate(formData.longitude, DEFAULT_EVENT_COORDINATES.longitude)

        setIsGeocoding(true)

        try {
            const address = await reverseGeocode(latitude, longitude)

            if (address) {
                setFormData((prev) => ({ ...prev, address }))
            }
        } finally {
            setIsGeocoding(false)
        }
    }

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: toDateTimeLocalValue(initialData?.date?.date),
                endDate: toDateTimeLocalValue(initialData?.endDate?.date),
                registrationStart: toDateTimeLocalValue(initialData?.registrationStart?.date),
                registrationEnd: toDateTimeLocalValue(initialData?.registrationEnd?.date),
                tickets: initialData?.availableTickets?.toString(),
                ticketPrice: initialData?.ticketPrice?.toString(),
                latitude: (initialData?.latitude ?? DEFAULT_EVENT_COORDINATES.latitude).toString(),
                longitude: (initialData?.longitude ?? DEFAULT_EVENT_COORDINATES.longitude).toString(),
                minAge: initialData?.minAge?.toString()
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

                <div className={styles.fieldWithHint}>
                    <Input
                        disabled={disabled}
                        className={styles.formElement}
                        type={'datetime-local'}
                        label={'Дата и время окончания'}
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                    <small className={styles.hint}>необязательно, по Оренбургскому времени</small>
                </div>

                <div className={styles.fieldWithHint}>
                    <Input
                        disabled={disabled}
                        className={styles.formElement}
                        type={'number'}
                        label={'Возрастное ограничение, лет'}
                        value={formData.minAge}
                        onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                    />
                    <small className={styles.hint}>необязательно, например 6</small>
                </div>
            </div>

            <Checkbox
                className={styles.formElement}
                label={'Требуется регистрация'}
                checked={formData.requiresRegistration ?? true}
                disabled={disabled}
                onChange={(e) => setFormData({ ...formData, requiresRegistration: e.target.checked })}
            />

            <div className={styles.sections}>
                <Input
                    required={formData.requiresRegistration ?? true}
                    disabled={disabled || !(formData.requiresRegistration ?? true)}
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
                    required={formData.requiresRegistration ?? true}
                    disabled={disabled || !(formData.requiresRegistration ?? true)}
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

            <Input
                disabled={disabled}
                className={styles.formElement}
                type={'input'}
                label={'Название площадки'}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />

            <div className={styles.addressRow}>
                <Input
                    disabled={disabled}
                    className={styles.formElement}
                    type={'input'}
                    label={'Адрес'}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
                <Button
                    mode={'secondary'}
                    label={'Найти по координатам'}
                    disabled={disabled}
                    loading={isGeocoding}
                    onClick={handleFindAddress}
                />
            </div>

            <div className={styles.sections}>
                <Input
                    disabled={disabled}
                    className={styles.formElement}
                    type={'number'}
                    label={'Широта'}
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />

                <Input
                    disabled={disabled}
                    className={styles.formElement}
                    type={'number'}
                    label={'Долгота'}
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
            </div>

            <div className={styles.mapSection}>
                <EventMap
                    editable
                    height={300}
                    latitude={toCoordinate(formData.latitude, DEFAULT_EVENT_COORDINATES.latitude)}
                    longitude={toCoordinate(formData.longitude, DEFAULT_EVENT_COORDINATES.longitude)}
                    onChange={handleMapChange}
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
