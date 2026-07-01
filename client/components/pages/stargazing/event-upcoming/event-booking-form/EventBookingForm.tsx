import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Message, Select } from 'simple-react-ui-kit'

import { API, ApiType, useAppSelector } from '@/api'
import { STARGAZING_RETRY_STORAGE_KEY } from '@/utils/constants'

import styles from './styles.module.sass'

interface EventBookingFormProps {
    eventId?: string
    /** Price per adult in RUB. Falsy / 0 means a free event. Children under 18 are always free. */
    ticketPrice?: number
    /** Called after a confirmed (free) booking; receives the booking id for ticket rendering. */
    onSuccessSubmit?: (bookingId?: string) => void
}

type EventBookingFormState = {
    name?: string
    phone?: string
    adults?: string
    children?: string
    childrenAges?: number[]
}

export const EventBookingForm: React.FC<EventBookingFormProps> = ({ eventId, ticketPrice, onSuccessSubmit }) => {
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

    const [bookEvent, { isLoading, isSuccess, isError, error }] = API.useEventsRegistrationPostMutation()

    const findError = (field: keyof ApiType.Events.ReqRegistration) =>
        ((error as ApiType.ResError)?.messages?.[field as never] as string | undefined) || undefined

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

        const result = await bookEvent(request)

        const data = 'data' in result ? (result.data as ApiType.Events.ResRegistration) : undefined

        // Paid event — the API returns a bank payment page URL to redirect to.
        if (data?.payment?.formUrl) {
            // Saved so a declined/failed payment can be retried (new order) from
            // the payment result page without re-filling this form.
            sessionStorage.setItem(STARGAZING_RETRY_STORAGE_KEY, JSON.stringify(request))

            setPaymentRedirect(true)
            window.location.href = data.payment.formUrl
            return
        }

        // Free event — confirmed immediately; keep the booking id to render the ticket.
        if (data?.bookingId) {
            setBookingId(data.bookingId)
        }
    }, [formState, eventId, bookEvent])

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
                    title={'Ошибка'}
                >
                    {(error as ApiType.ResError)?.messages?.error ||
                        'При регистрации были допущены ошибки, проверьте правильность заполнения полей'}
                </Message>
            )}

            {isSuccess && !isPaid && (
                <Message
                    type={'success'}
                    title={'Успешно!'}
                >
                    {'Вы зарегистрировались на мероприятие'}
                </Message>
            )}

            {paymentRedirect && (
                <Message
                    type={'info'}
                    title={'Бронируем место'}
                >
                    {'Место забронировано, перенаправляем вас на страницу оплаты…'}
                </Message>
            )}

            <Input
                className={styles.field}
                required={true}
                label={'Укажите ваше имя'}
                name={'name'}
                placeholder={'Укажите ваше имя'}
                value={formState.name || ''}
                error={findError('name')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <Input
                className={styles.field}
                label={'Укажите ваш номер телефона'}
                name={'phone'}
                placeholder={'Укажите ваш номер телефона'}
                value={formState.phone || ''}
                error={findError('phone')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <div className={styles.countPeopleContainer}>
                <Select<string>
                    className={styles.countPeopleField}
                    label={'Взрослых'}
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
                    label={'Детей'}
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
                            {'Возраст ребенка'} {index + 1}
                        </label>
                        <Select<string>
                            placeholder={'Выберите возраст'}
                            options={[...Array(13)].map((_, age) => ({
                                key: String(age + 5),
                                value: `${age + 5} лет`
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
                        {`${Number(formState.adults || 1)} взрослых × ${ticketPrice} ₽ = `}
                        <strong>{`${Number(formState.adults || 1) * (ticketPrice || 0)} ₽`}</strong>
                    </div>
                    <div className={styles.priceNote}>{'Дети до 18 лет — бесплатно'}</div>
                </div>
            )}

            <Button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={isLoading || isSuccess || Number(formState?.children) !== formState?.childrenAges?.length}
                loading={isLoading}
            >
                {isPaid ? 'Перейти к оплате' : 'Забронировать'}
            </Button>
        </div>
    )
}
