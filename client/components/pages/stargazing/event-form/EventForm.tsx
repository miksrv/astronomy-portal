import React, { useEffect, useState } from 'react'
import { Controller, FieldErrors, useForm, useWatch } from 'react-hook-form'
import { Button, Checkbox, Container, Input, TextArea } from 'simple-react-ui-kit'
import { zodResolver } from '@hookform/resolvers/zod'

import Image from 'next/image'

import { ApiModel, ApiType } from '@/api'
import { hosts } from '@/api/constants'
import { DEFAULT_EVENT_COORDINATES, EventMap } from '@/components/common/event-map'
import { DateTimeInput } from '@/components/ui/date-time-input'
import useApiFormError from '@/hooks/useApiFormError'
import useScrollToApiFieldErrors from '@/hooks/useScrollToApiFieldErrors'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import { toDateTimeLocalValue } from '@/utils/dates'
import { flattenFieldErrorPaths, scrollToFirstFieldError } from '@/utils/formErrorScroll'
import { reverseGeocode } from '@/utils/geocoding'

import { DATE_FIELD_ALIASES } from './constants'
import { eventFormSchema } from './schema'
import { toCoordinate, toDatePart } from './utils'

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

export const EventForm: React.FC<EventFormProps> = ({ disabled, initialData, error, onSubmit, onCancel }) => {
    const [isGeocoding, setIsGeocoding] = useState(false)

    const {
        control,
        handleSubmit,
        reset,
        getValues,
        setValue,
        setError,
        formState: { errors }
    } = useForm<EventFormType>({
        resolver: zodResolver(eventFormSchema),
        // Prefill sensible defaults for a brand-new event. In edit mode the
        // effect below overwrites these with the existing event's values.
        defaultValues: {
            requiresRegistration: true,
            ticketPrice: '500',
            latitude: String(DEFAULT_EVENT_COORDINATES.latitude),
            longitude: String(DEFAULT_EVENT_COORDINATES.longitude)
        }
    })

    // Reactive read of the whole form, for values used to drive other
    // fields' props (minDate bounds, disabled state, the map preview) rather
    // than to bind an individual input.
    const formValues = useWatch({ control })

    // Server-side validation errors (field name -> message), synced into RHF
    // so they show up next to the matching input just like client-side
    // (zod) errors, instead of only in a generic banner.
    const { fieldErrors } = useApiFormError(error)
    useSyncApiFieldErrors(fieldErrors, setError)
    useScrollToApiFieldErrors(fieldErrors, DATE_FIELD_ALIASES)

    const handleMapChange = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        setValue('latitude', latitude.toFixed(7))
        setValue('longitude', longitude.toFixed(7))
    }

    const handleFindAddress = async () => {
        const latitude = toCoordinate(getValues('latitude'), DEFAULT_EVENT_COORDINATES.latitude)
        const longitude = toCoordinate(getValues('longitude'), DEFAULT_EVENT_COORDINATES.longitude)

        setIsGeocoding(true)

        try {
            const address = await reverseGeocode(latitude, longitude)

            if (address) {
                setValue('address', address)
            }
        } finally {
            setIsGeocoding(false)
        }
    }

    useEffect(() => {
        if (initialData) {
            reset({
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
    }, [initialData, reset])

    const requiresRegistration = formValues.requiresRegistration ?? true

    const onFormSubmit = (data: EventFormType) => {
        onSubmit?.(data)
    }

    // Fires when a submit attempt fails client-side (zod) validation - with
    // no mutation ever called, this is the only signal the user gets, so it
    // has to do more than the inline field message on its own can (see
    // `scrollToFirstFieldError`).
    const onFormInvalid = (formErrors: FieldErrors<EventFormType>) => {
        scrollToFirstFieldError(flattenFieldErrorPaths(formErrors), DATE_FIELD_ALIASES)
    }

    return (
        <form
            className={styles.formSections}
            onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
            noValidate={true}
        >
            <Container>
                <Controller
                    name={'title'}
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            required={true}
                            disabled={disabled}
                            className={styles.formElement}
                            type={'input'}
                            label={'Заголовок'}
                            error={errors.title?.message}
                        />
                    )}
                />

                <Controller
                    name={'content'}
                    control={control}
                    render={({ field }) => (
                        <TextArea
                            {...field}
                            disabled={disabled}
                            className={styles.formElement}
                            label={'Описание'}
                            autoResize={true}
                            error={errors.content?.message}
                            style={{ width: '100%' }}
                        />
                    )}
                />
                <hr className={styles.divider} />

                <div className={styles.sections}>
                    <Controller
                        name={'date'}
                        control={control}
                        render={({ field }) => (
                            <DateTimeInput
                                required={true}
                                disabled={disabled}
                                testId={'date'}
                                className={styles.formElement}
                                label={'Начало'}
                                value={field.value}
                                error={errors.date?.message}
                                hint={'по Оренбургскому времени'}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        name={'endDate'}
                        control={control}
                        render={({ field }) => (
                            <DateTimeInput
                                disabled={disabled}
                                testId={'end-date'}
                                className={styles.formElement}
                                label={'Окончание'}
                                value={field.value}
                                minDate={toDatePart(formValues.date)}
                                error={errors.endDate?.message}
                                hint={'необязательно, по Оренбургскому времени'}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>
                <hr className={styles.divider} />

                <div className={styles.sections}>
                    <div className={styles.fieldWithHint}>
                        <Controller
                            name={'tickets'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    required={true}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'number'}
                                    label={'Количество доступных мест'}
                                    error={errors.tickets?.message}
                                />
                            )}
                        />
                        {!errors.tickets && <small className={styles.hint}>Считается только по взрослым</small>}
                    </div>

                    <div className={styles.fieldWithHint}>
                        <Controller
                            name={'ticketPrice'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'number'}
                                    label={'Цена билета за взрослого, ₽'}
                                    error={errors.ticketPrice?.message}
                                />
                            )}
                        />
                        {!errors.ticketPrice && (
                            <small className={styles.hint}>0 — бесплатно, дети до 18 лет бесплатно</small>
                        )}
                    </div>

                    <div className={styles.fieldWithHint}>
                        <Controller
                            name={'minAge'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'number'}
                                    label={'Возрастное ограничение, лет'}
                                    error={errors.minAge?.message}
                                />
                            )}
                        />
                        {!errors.minAge && <small className={styles.hint}>необязательно, например 6</small>}
                    </div>
                </div>

                <Controller
                    name={'requiresRegistration'}
                    control={control}
                    render={({ field }) => (
                        <Checkbox
                            className={styles.formElement}
                            label={'Требуется регистрация'}
                            checked={field.value ?? true}
                            disabled={disabled}
                            onChange={(e) => field.onChange(e.target.checked)}
                        />
                    )}
                />

                <div className={styles.sections}>
                    <Controller
                        name={'registrationStart'}
                        control={control}
                        render={({ field }) => (
                            <DateTimeInput
                                required={requiresRegistration}
                                disabled={disabled || !requiresRegistration}
                                testId={'registration-start'}
                                className={styles.formElement}
                                label={'Дата начала регистрации'}
                                value={field.value}
                                error={errors.registrationStart?.message}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        name={'registrationEnd'}
                        control={control}
                        render={({ field }) => (
                            <DateTimeInput
                                required={requiresRegistration}
                                disabled={disabled || !requiresRegistration}
                                testId={'registration-end'}
                                className={styles.formElement}
                                label={'Дата завершения регистрации'}
                                value={field.value}
                                minDate={toDatePart(formValues.registrationStart)}
                                error={errors.registrationEnd?.message}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>
                <hr className={styles.divider} />

                <div className={styles.locationSection}>
                    <div className={styles.coordsColumn}>
                        <Controller
                            name={'latitude'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'number'}
                                    label={'Широта'}
                                    error={errors.latitude?.message}
                                />
                            )}
                        />

                        <Controller
                            name={'longitude'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'number'}
                                    label={'Долгота'}
                                    error={errors.longitude?.message}
                                />
                            )}
                        />
                    </div>

                    <div className={styles.addressColumn}>
                        <Controller
                            name={'location'}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={disabled}
                                    className={styles.formElement}
                                    type={'input'}
                                    label={'Название площадки'}
                                    error={errors.location?.message}
                                />
                            )}
                        />

                        <div className={styles.addressRow}>
                            <Controller
                                name={'address'}
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        disabled={disabled}
                                        className={styles.formElement}
                                        type={'input'}
                                        label={'Адрес'}
                                        error={errors.address?.message}
                                    />
                                )}
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
                        latitude={toCoordinate(formValues.latitude, DEFAULT_EVENT_COORDINATES.latitude)}
                        longitude={toCoordinate(formValues.longitude, DEFAULT_EVENT_COORDINATES.longitude)}
                        onChange={handleMapChange}
                    />
                </div>
                <hr className={styles.divider} />

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
                    <label htmlFor={'event-cover-upload'}>
                        {initialData?.coverFileName ? 'Заменить обложку:' : 'Загрузить обложку:'}
                    </label>
                    <Controller
                        name={'upload'}
                        control={control}
                        render={({ field: { value: _value, onChange, ...field } }) => (
                            <input
                                {...field}
                                id={'event-cover-upload'}
                                disabled={disabled}
                                onChange={(e) => onChange(e.target.files?.[0])}
                                type={'file'}
                                accept={'image/png, image/gif, image/jpeg'}
                            />
                        )}
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
                        type={'submit'}
                        mode={'primary'}
                        variant={'positive'}
                        label={'Сохранить'}
                        disabled={disabled}
                    />
                </div>
            </Container>
        </form>
    )
}
