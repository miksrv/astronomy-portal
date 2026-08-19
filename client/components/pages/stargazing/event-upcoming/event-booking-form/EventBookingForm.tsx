import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Message, Select } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiType, useAppSelector } from '@/api'
import { PhoneInput } from '@/components/common/phone-input'
import { useApiFormError } from '@/hooks/useApiFormError'

import { useEventBookingSubmit } from '../useEventBookingSubmit'

import styles from './styles.module.sass'

interface EventBookingFormProps {
    eventId?: string
    /** Price per adult in RUB. Falsy / 0 means a free event. Children under 18 are always free. */
    ticketPrice?: number
    /** Called after a confirmed (free) booking; receives the booking id for ticket rendering. */
    onSuccessSubmit?: (bookingId?: string) => void
    /** Called once a paid booking got its bank payment URL — the caller (EventUpcoming)
     * takes over rendering a "redirecting…" panel for the moment before the browser
     * actually navigates away. */
    onPaymentRedirect?: (formUrl: string) => void
}

type EventBookingFormState = {
    name?: string
    phone?: string
    adults?: string
    children?: string
    childrenAges?: number[]
}

export const EventBookingForm: React.FC<EventBookingFormProps> = ({
    eventId,
    ticketPrice,
    onSuccessSubmit,
    onPaymentRedirect
}) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    const isPaid = !!ticketPrice && ticketPrice > 0

    const [submitted, setSubmitted] = useState<boolean>(false)
    const [paymentRedirect, setPaymentRedirect] = useState<boolean>(false)
    const [bookingId, setBookingId] = useState<string>()
    const [formState, setFormState] = useState<EventBookingFormState>({
        adults: '1',
        children: '0',
        childrenAges: [],
        name: user?.name || '',
        phone: user?.phone || ''
    })

    const { submit, isLoading, isSuccess, isError, error } = useEventBookingSubmit()

    const { message: errorMessage, fieldErrors } = useApiFormError(error)

    const handleChange = ({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) => e.key === 'Enter' && void handleSubmit()

    const handleSubmit = useCallback(async () => {
        if (!eventId) {
            return
        }

        setSubmitted(true)

        const request: ApiType.Events.ReqRegistration = {
            adults: Number(formState.adults || 1),
            children: Number(formState.children || 1),
            childrenAges: formState.childrenAges?.length ? formState.childrenAges : undefined,
            eventId: eventId,
            name: formState.name,
            phone: formState.phone?.length ? formState.phone : undefined
        }

        const result = await submit(request)

        // Paid event — the API returns a bank payment page URL; submit() has
        // already redirected there. `paymentRedirect` only gates the effect
        // below; the redirecting panel itself is rendered by the parent.
        if (result?.redirectedToPayment) {
            setPaymentRedirect(true)
            onPaymentRedirect?.(result.formUrl || '')
            return
        }

        // Free event — confirmed immediately; keep the booking id to render the ticket.
        if (result?.bookingId) {
            setBookingId(result.bookingId)
        }
    }, [formState, eventId, submit])

    useEffect(() => {
        if (
            formState.childrenAges?.length &&
            (Number(formState.children) > formState.childrenAges.length ||
                formState.childrenAges.length > Number(formState.children))
        ) {
            setFormState({
                ...formState,
                childrenAges: formState.childrenAges.slice(0, Number(formState.children))
            })
        }
    }, [formState?.children])

    useEffect(() => {
        // For paid events the user is redirected to the bank; confirmation
        // happens on return, so don't mark as registered here.
        if (isSuccess && submitted && !paymentRedirect) {
            onSuccessSubmit?.(bookingId)
        }
    }, [isSuccess, bookingId])

    return (
        <div className={styles.form}>
            {isError && (
                <Message
                    type={'error'}
                    title={t('components.pages.stargazing.event-upcoming.booking-form-error-title', 'Ошибка')}
                >
                    {errorMessage ||
                        t(
                            'components.pages.stargazing.event-upcoming.booking-form-error-default',
                            'При регистрации были допущены ошибки, проверьте правильность заполнения полей'
                        )}
                </Message>
            )}

            {isSuccess && !isPaid && (
                <Message
                    type={'success'}
                    title={t('components.pages.stargazing.event-upcoming.booking-form-success-title', 'Успешно!')}
                >
                    {t(
                        'components.pages.stargazing.event-upcoming.booking-form-success-text',
                        'Вы зарегистрировались на мероприятие'
                    )}
                </Message>
            )}

            <div className={styles.identityFields}>
                <Input
                    className={styles.field}
                    required={true}
                    label={t('components.pages.stargazing.event-upcoming.booking-form-name-label', 'Ваше имя')}
                    name={'name'}
                    placeholder={t(
                        'components.pages.stargazing.event-upcoming.booking-form-name-placeholder',
                        'Укажите ваше имя'
                    )}
                    value={formState.name || ''}
                    error={fieldErrors.name}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />

                <PhoneInput
                    className={styles.field}
                    label={t('components.pages.stargazing.event-upcoming.booking-form-phone-label', 'Номер телефона')}
                    name={'phone'}
                    placeholder={t(
                        'components.pages.stargazing.event-upcoming.booking-form-phone-placeholder',
                        'Укажите ваш номер телефона'
                    )}
                    value={formState.phone || ''}
                    error={fieldErrors.phone}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <div className={styles.countPeopleContainer}>
                <Select<string>
                    className={styles.countPeopleField}
                    label={t('components.pages.stargazing.event-upcoming.booking-form-adults-label', 'Взрослых')}
                    options={[...Array(5)].map((_, value) => ({
                        key: String(value + 1),
                        value: String(value + 1)
                    }))}
                    value={formState.adults || ''}
                    onSelect={(option) => {
                        setFormState({
                            ...formState,
                            adults: option?.[0]?.value || ''
                        })
                    }}
                />

                <Select<string>
                    className={styles.countPeopleField}
                    label={t('components.pages.stargazing.event-upcoming.booking-form-children-label', 'Детей')}
                    options={[...Array(6)].map((_, value) => ({
                        key: String(value),
                        value: String(value)
                    }))}
                    value={String(formState.children) || ''}
                    onSelect={(option) => {
                        setFormState({
                            ...formState,
                            children: option?.[0]?.value
                        })
                    }}
                />
            </div>

            {formState.children &&
                Number(formState.children) > 0 &&
                Array.from({ length: Number(formState.children) }, (_, index) => (
                    <div
                        key={index}
                        className={styles.childrenAges}
                    >
                        <label>
                            {t(
                                'components.pages.stargazing.event-upcoming.booking-form-child-age-label',
                                'Возраст ребенка {{index}}',
                                { index: index + 1 }
                            )}
                        </label>
                        <Select<string>
                            placeholder={t(
                                'components.pages.stargazing.event-upcoming.booking-form-child-age-placeholder',
                                'Выберите возраст'
                            )}
                            options={[...Array(13)].map((_, age) => ({
                                key: String(age + 5),
                                value: t(
                                    'components.pages.stargazing.event-upcoming.booking-form-child-age-option',
                                    '{{age}} лет',
                                    { age: age + 5 }
                                )
                            }))}
                            value={String(formState?.childrenAges?.[index]) || ''}
                            onSelect={(option) => {
                                const newAges = [...(formState?.childrenAges ?? [])]

                                newAges[index] = Number(option?.[0]?.key)

                                setFormState({
                                    ...formState,
                                    childrenAges: newAges
                                })
                            }}
                        />
                    </div>
                ))}

            {isPaid && (
                <div
                    className={styles.priceContainer}
                    data-testid={'price-summary'}
                >
                    <div className={styles.priceTotal}>
                        {t(
                            'components.pages.stargazing.event-upcoming.booking-form-price-summary',
                            '{{adults}} взрослых × {{price}} ₽ = ',
                            { adults: Number(formState.adults || 1), price: ticketPrice }
                        )}
                        <strong>{`${Number(formState.adults || 1) * (ticketPrice || 0)} ₽`}</strong>
                    </div>
                    <div className={styles.priceNote}>
                        {t(
                            'components.pages.stargazing.event-upcoming.booking-form-price-note',
                            'Дети до 18 лет — бесплатно'
                        )}
                    </div>
                </div>
            )}

            <Button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={isLoading || isSuccess || Number(formState?.children) !== formState?.childrenAges?.length}
                loading={isLoading}
            >
                {isPaid
                    ? t('components.pages.stargazing.event-upcoming.booking-form-submit-pay', 'Перейти к оплате')
                    : t('components.pages.stargazing.event-upcoming.booking-form-submit-book', 'Забронировать')}
            </Button>
        </div>
    )
}
