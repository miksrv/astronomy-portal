import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button, Input, Message, Select } from 'simple-react-ui-kit'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useTranslation } from 'next-i18next/pages'

import { ApiType, useAppSelector } from '@/api'
import { PhoneInput } from '@/components/common/phone-input'
import { useApiFormError } from '@/hooks/useApiFormError'
import { useSyncApiFieldErrors } from '@/hooks/useSyncApiFieldErrors'

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

// After stripping everything but digits, a real phone number falls in this
// range — matches what PhoneInput's own sanitizer lets the field contain.
const PHONE_DIGITS_PATTERN = /^\d{10,15}$/

interface EventBookingFormValues {
    name: string
    phone: string
    adults: string
    children: string
    childrenAges: Array<{ age?: number }>
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

    const { submit, isLoading, isSuccess, isError, error } = useEventBookingSubmit()

    const { message: errorMessage, fieldErrors } = useApiFormError(error)

    const bookingSchema = useMemo(
        () =>
            z
                .object({
                    name: z
                        .string()
                        .trim()
                        .min(
                            1,
                            t(
                                'components.pages.stargazing.event-upcoming.booking-form-name-required',
                                'Введите ваше имя'
                            )
                        ),
                    phone: z
                        .string()
                        .trim()
                        .min(
                            1,
                            t(
                                'components.pages.stargazing.event-upcoming.booking-form-phone-required',
                                'Введите номер телефона'
                            )
                        )
                        .refine(
                            (value) => PHONE_DIGITS_PATTERN.test(value.replace(/\D/g, '')),
                            t(
                                'components.pages.stargazing.event-upcoming.booking-form-phone-invalid',
                                'Введите корректный номер телефона'
                            )
                        ),
                    adults: z.string(),
                    children: z.string(),
                    childrenAges: z.array(z.object({ age: z.number().optional() }))
                })
                .superRefine((values, ctx) => {
                    const childrenCount = Number(values.children || 0)

                    if (childrenCount === 0) {
                        return
                    }

                    // Normally kept in sync by the effect below that grows/shrinks
                    // `childrenAges` to match the selected count — a length mismatch
                    // here means that sync hasn't happened yet (e.g. submit fired in
                    // the same tick as changing the children count). Flag the whole
                    // array rather than guessing which per-child selects to blame.
                    if (values.childrenAges.length !== childrenCount) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t(
                                'components.pages.stargazing.event-upcoming.booking-form-children-ages-required',
                                'Укажите возраст каждого ребенка'
                            ),
                            path: ['childrenAges']
                        })
                        return
                    }

                    // Otherwise flag each child's own select individually, so it
                    // highlights in place instead of a single message for the group.
                    values.childrenAges.forEach((item, index) => {
                        if (typeof item.age !== 'number') {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t(
                                    'components.pages.stargazing.event-upcoming.booking-form-child-age-required',
                                    'Укажите возраст'
                                ),
                                path: ['childrenAges', index, 'age']
                            })
                        }
                    })
                }),
        [t]
    )

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors: formErrors, isSubmitting }
    } = useForm<EventBookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            name: user?.name || '',
            phone: user?.phone || '',
            adults: '1',
            children: '0',
            childrenAges: []
        }
    })

    useSyncApiFieldErrors(fieldErrors, setError)

    const {
        fields: childrenAgeFields,
        append: appendChildrenAge,
        remove: removeChildrenAge
    } = useFieldArray({ control, name: 'childrenAges' })

    const childrenValue = useWatch({ control, name: 'children' })
    const adultsValue = useWatch({ control, name: 'adults' })

    // Keeps the childrenAges field array's length in sync with the selected
    // number of children, so there's always exactly one age selector per child.
    useEffect(() => {
        const target = Number(childrenValue || 0)

        if (childrenAgeFields.length < target) {
            for (let i = childrenAgeFields.length; i < target; i++) {
                appendChildrenAge({ age: undefined })
            }
        } else if (childrenAgeFields.length > target) {
            for (let i = childrenAgeFields.length - 1; i >= target; i--) {
                removeChildrenAge(i)
            }
        }
    }, [childrenValue, childrenAgeFields.length, appendChildrenAge, removeChildrenAge])

    const onValid = async (values: EventBookingFormValues) => {
        if (!eventId) {
            return
        }

        setSubmitted(true)

        const childrenAges = values.childrenAges
            .map((item) => item.age)
            .filter((age): age is number => typeof age === 'number')

        const request: ApiType.Events.ReqRegistration = {
            adults: Number(values.adults || 1),
            children: Number(values.children || 1),
            childrenAges: childrenAges.length ? childrenAges : undefined,
            eventId,
            name: values.name,
            phone: values.phone?.length ? values.phone : undefined
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
    }

    useEffect(() => {
        // For paid events the user is redirected to the bank; confirmation
        // happens on return, so don't mark as registered here. `submitted` is
        // included so this still fires if `isSuccess` flips true before the
        // (now async, resolver-gated) submit handler finishes setting it.
        if (isSuccess && submitted && !paymentRedirect) {
            onSuccessSubmit?.(bookingId)
        }
    }, [isSuccess, submitted, paymentRedirect, bookingId])

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit(onValid)}
            noValidate={true}
        >
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
                <Controller
                    name={'name'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Input
                            {...field}
                            className={styles.field}
                            required={true}
                            label={t('components.pages.stargazing.event-upcoming.booking-form-name-label', 'Ваше имя')}
                            placeholder={t(
                                'components.pages.stargazing.event-upcoming.booking-form-name-placeholder',
                                'Укажите ваше имя'
                            )}
                            error={fieldState.error?.message}
                        />
                    )}
                />

                <Controller
                    name={'phone'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <PhoneInput
                            {...field}
                            className={styles.field}
                            required={true}
                            label={t(
                                'components.pages.stargazing.event-upcoming.booking-form-phone-label',
                                'Номер телефона'
                            )}
                            placeholder={t(
                                'components.pages.stargazing.event-upcoming.booking-form-phone-placeholder',
                                'Укажите ваш номер телефона'
                            )}
                            error={fieldState.error?.message}
                        />
                    )}
                />
            </div>

            <div className={styles.countPeopleContainer}>
                <Controller
                    name={'adults'}
                    control={control}
                    render={({ field }) => (
                        <Select<string>
                            className={styles.countPeopleField}
                            label={t(
                                'components.pages.stargazing.event-upcoming.booking-form-adults-label',
                                'Взрослых'
                            )}
                            options={[...Array(5)].map((_, value) => ({
                                key: String(value + 1),
                                value: String(value + 1)
                            }))}
                            value={field.value}
                            onSelect={(option) => field.onChange(option?.[0]?.value || '')}
                        />
                    )}
                />

                <Controller
                    name={'children'}
                    control={control}
                    render={({ field }) => (
                        <Select<string>
                            className={styles.countPeopleField}
                            label={t('components.pages.stargazing.event-upcoming.booking-form-children-label', 'Детей')}
                            options={[...Array(6)].map((_, value) => ({
                                key: String(value),
                                value: String(value)
                            }))}
                            value={field.value}
                            onSelect={(option) => field.onChange(option?.[0]?.value || '')}
                        />
                    )}
                />
            </div>

            {childrenAgeFields.map((fieldItem, index) => (
                <div
                    key={fieldItem.id}
                    className={styles.childrenAges}
                >
                    <label>
                        {t(
                            'components.pages.stargazing.event-upcoming.booking-form-child-age-label',
                            'Возраст ребенка {{index}}',
                            { index: index + 1 }
                        )}
                    </label>
                    <Controller
                        name={`childrenAges.${index}.age` as const}
                        control={control}
                        render={({ field, fieldState }) => (
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
                                value={field.value !== undefined ? String(field.value) : ''}
                                // Just highlight this select in red — the message is
                                // redundant here, the "Возраст ребенка N" label above
                                // already says exactly what's missing. The installed
                                // kit's `error` prop is typed as `string`, but at
                                // runtime it only needs to be truthy: the kit renders
                                // `{error}` as a plain JSX child, and React silently
                                // drops a boolean child, so `true` gives the red
                                // border with no rendered text. Cast to satisfy the
                                // (stricter-than-reality) type.
                                error={!!fieldState.error as unknown as string}
                                onSelect={(option) => {
                                    const key = option?.[0]?.key
                                    field.onChange(key !== undefined ? Number(key) : undefined)
                                }}
                            />
                        )}
                    />
                </div>
            ))}

            {formErrors.childrenAges?.message && (
                <p className={styles.childrenAgesError}>{formErrors.childrenAges.message}</p>
            )}

            {isPaid && (
                <div
                    className={styles.priceContainer}
                    data-testid={'price-summary'}
                >
                    <div className={styles.priceTotal}>
                        {t(
                            'components.pages.stargazing.event-upcoming.booking-form-price-summary',
                            '{{adults}} взрослых × {{price}} ₽ = ',
                            { adults: Number(adultsValue || 1), price: ticketPrice }
                        )}
                        <strong>{`${Number(adultsValue || 1) * (ticketPrice || 0)} ₽`}</strong>
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
                type={'submit'}
                className={styles.submitButton}
                disabled={isSubmitting || isLoading || isSuccess}
                loading={isSubmitting || isLoading}
            >
                {isPaid
                    ? t('components.pages.stargazing.event-upcoming.booking-form-submit-pay', 'Перейти к оплате')
                    : t('components.pages.stargazing.event-upcoming.booking-form-submit-book', 'Забронировать')}
            </Button>
        </form>
    )
}
