import React, { useEffect, useState } from 'react'
import { Button, Checkbox, Container, Input, TextArea } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel, ApiType } from '@/api'
import { hosts } from '@/api/constants'
import { DEFAULT_EVENT_COORDINATES, EventMap } from '@/components/common/event-map'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { toDateTimeLocalValue } from '@/utils/dates'
import { getFieldErrors } from '@/utils/errors'
import { reverseGeocode } from '@/utils/geocoding'

import styles from './styles.module.sass'

type EventFormType = ApiType.Events.EventFormType

interface EventFormProps {
    disabled?: boolean
    initialData?: ApiModel.Event
    /** RTK Query error from the create/patch mutation — shown inline next to the field it belongs to. */
    error?: unknown
    onSubmit?: (formData?: EventFormType) => void
    onCancel?: () => void
}

const toCoordinate = (value: string | undefined, fallback: number): number => {
    const parsed = value !== undefined ? parseFloat(value) : NaN

    return Number.isFinite(parsed) ? parsed : fallback
}

const toDatePart = (value?: string): string | undefined => value?.split('T')?.[0]

// All four fields are `datetime-local`-compatible values ("YYYY-MM-DDTHH:mm")
// entered and compared as raw Orenburg wall-clock strings — no timezone
// conversion needed here since lexical order matches chronological order for
// that format, and both sides of every comparison are the same "Orenburg
// local" convention the backend's parseOrenburgDateTime() applies. Mirrors
// the checks Events::create()/update() enforce server-side (see
// Events.invalidRegistrationWindow/invalidEventEndDate) so a bad date
// combination is caught immediately instead of round-tripping to a 400 (or,
// if the front-end guard is ever the only line of defense, silently saving
// something the booking-status UI can't render — see the 2026-08-19 incident
// where registrationEnd fell after the event's own date and the
// "registration closed" panel simply never appeared).
const validateEventDates = (data: EventFormType): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (data.endDate && data.date && data.endDate <= data.date) {
        errors.endDate = 'Время окончания мероприятия должно быть позже времени начала'
    }

    if (data.requiresRegistration ?? true) {
        if (data.registrationStart && data.registrationEnd && data.registrationStart >= data.registrationEnd) {
            errors.registrationEnd = 'Регистрация должна открываться раньше, чем закрываться'
        } else if (data.registrationEnd && data.date && data.registrationEnd > data.date) {
            errors.registrationEnd = 'Регистрация должна закрываться не позднее даты и времени проведения мероприятия'
        }
    }

    return errors
}

export const EventForm: React.FC<EventFormProps> = ({ disabled, initialData, error, onSubmit, onCancel }) => {
    // Prefill sensible defaults for a brand-new event. In edit mode the effect
    // below overwrites these with the existing event's values.
    const [formData, setFormData] = useState<EventFormType>({
        requiresRegistration: true,
        ticketPrice: '500',
        latitude: String(DEFAULT_EVENT_COORDINATES.latitude),
        longitude: String(DEFAULT_EVENT_COORDINATES.longitude)
    })

    const [dateErrors, setDateErrors] = useState<Record<string, string>>({})

    const [isGeocoding, setIsGeocoding] = useState(false)

    // Server-side validation errors (field name -> message), shown next to the
    // matching input so a save failure doesn't send the admin to the network
    // tab to figure out what went wrong.
    const fieldErrors = getFieldErrors(error)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, upload: e?.target?.files?.[0] })
    }

    const handleSubmit = () => {
        const errors = validateEventDates(formData)

        setDateErrors(errors)

        if (Object.keys(errors).length > 0) {
            return
        }

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

    const requiresRegistration = formData.requiresRegistration ?? true

    return (
        <div className={styles.formSections}>
            <Container title={'Основное'}>
                <Input
                    required={true}
                    disabled={disabled}
                    className={styles.formElement}
                    type={'input'}
                    label={'Заголовок'}
                    value={formData.title}
                    error={fieldErrors.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />

                <TextArea
                    disabled={disabled}
                    className={styles.formElement}
                    label={'Описание'}
                    autoResize={true}
                    value={formData.content}
                    error={fieldErrors.content}
                    style={{ width: '100%' }}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
            </Container>

            <Container title={'Дата и время проведения'}>
                <div className={styles.sections}>
                    <DateTimePicker
                        required={true}
                        disabled={disabled}
                        testId={'date'}
                        className={styles.formElement}
                        label={'Начало'}
                        value={formData.date}
                        error={fieldErrors.date}
                        hint={'по Оренбургскому времени'}
                        onChange={(value) => setFormData({ ...formData, date: value })}
                    />

                    <DateTimePicker
                        disabled={disabled}
                        testId={'end-date'}
                        className={styles.formElement}
                        label={'Окончание'}
                        value={formData.endDate}
                        minDate={toDatePart(formData.date)}
                        error={dateErrors.endDate || fieldErrors.endDate}
                        hint={'необязательно, по Оренбургскому времени'}
                        onChange={(value) => {
                            setFormData({ ...formData, endDate: value })
                            setDateErrors({ ...dateErrors, endDate: '' })
                        }}
                    />
                </div>
            </Container>

            <Container title={'Билеты и регистрация'}>
                <div className={styles.sections}>
                    <div className={styles.fieldWithHint}>
                        <Input
                            required={true}
                            disabled={disabled}
                            className={styles.formElement}
                            type={'number'}
                            label={'Количество доступных мест'}
                            value={formData.tickets}
                            error={fieldErrors.tickets}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    tickets: e.target.value
                                })
                            }
                        />
                        {!fieldErrors.tickets && <small className={styles.hint}>Считается только по взрослым</small>}
                    </div>

                    <div className={styles.fieldWithHint}>
                        <Input
                            disabled={disabled}
                            className={styles.formElement}
                            type={'number'}
                            label={'Цена билета за взрослого, ₽'}
                            value={formData.ticketPrice}
                            error={fieldErrors.ticketPrice}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    ticketPrice: e.target.value
                                })
                            }
                        />
                        {!fieldErrors.ticketPrice && (
                            <small className={styles.hint}>0 — бесплатно, дети до 18 лет бесплатно</small>
                        )}
                    </div>

                    <div className={styles.fieldWithHint}>
                        <Input
                            disabled={disabled}
                            className={styles.formElement}
                            type={'number'}
                            label={'Возрастное ограничение, лет'}
                            value={formData.minAge}
                            error={fieldErrors.minAge}
                            onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                        />
                        {!fieldErrors.minAge && <small className={styles.hint}>необязательно, например 6</small>}
                    </div>
                </div>

                <Checkbox
                    className={styles.formElement}
                    label={'Требуется регистрация'}
                    checked={requiresRegistration}
                    disabled={disabled}
                    onChange={(e) => setFormData({ ...formData, requiresRegistration: e.target.checked })}
                />

                <div className={styles.sections}>
                    <DateTimePicker
                        required={requiresRegistration}
                        disabled={disabled || !requiresRegistration}
                        testId={'registration-start'}
                        className={styles.formElement}
                        label={'Дата начала регистрации'}
                        value={formData.registrationStart}
                        error={fieldErrors.registrationStart}
                        onChange={(value) => {
                            setFormData({
                                ...formData,
                                registrationStart: value
                            })
                            setDateErrors({ ...dateErrors, registrationEnd: '' })
                        }}
                    />

                    <DateTimePicker
                        required={requiresRegistration}
                        disabled={disabled || !requiresRegistration}
                        testId={'registration-end'}
                        className={styles.formElement}
                        label={'Дата завершения регистрации'}
                        value={formData.registrationEnd}
                        minDate={toDatePart(formData.registrationStart)}
                        error={dateErrors.registrationEnd || fieldErrors.registrationEnd}
                        onChange={(value) => {
                            setFormData({
                                ...formData,
                                registrationEnd: value
                            })
                            setDateErrors({ ...dateErrors, registrationEnd: '' })
                        }}
                    />
                </div>
            </Container>

            <Container title={'Место проведения'}>
                <div className={styles.locationSection}>
                    <div className={styles.coordsColumn}>
                        <Input
                            disabled={disabled}
                            className={styles.formElement}
                            type={'number'}
                            label={'Широта'}
                            value={formData.latitude}
                            error={fieldErrors.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        />

                        <Input
                            disabled={disabled}
                            className={styles.formElement}
                            type={'number'}
                            label={'Долгота'}
                            value={formData.longitude}
                            error={fieldErrors.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        />
                    </div>

                    <div className={styles.addressColumn}>
                        <Input
                            disabled={disabled}
                            className={styles.formElement}
                            type={'input'}
                            label={'Название площадки'}
                            value={formData.location}
                            error={fieldErrors.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />

                        <div className={styles.addressRow}>
                            <Input
                                disabled={disabled}
                                className={styles.formElement}
                                type={'input'}
                                label={'Адрес'}
                                value={formData.address}
                                error={fieldErrors.address}
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
                    </div>
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
            </Container>

            <Container title={'Обложка мероприятия'}>
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
            </Container>

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
        </div>
    )
}
