import React, { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button, Message, TextArea } from 'simple-react-ui-kit'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import useApiFormError from '@/hooks/useApiFormError'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'

import styles from './styles.module.sass'

const MIN_CONTENT_LENGTH = 10
const MAX_CONTENT_LENGTH = 1000

interface ReviewFormProps {
    entityType: ApiModel.CommentEntityType
    entityId: string
    onSuccess?: () => void
    /**
     * Lets a caller that renders the review list (e.g. `EventReviews`) show
     * the new review optimistically instead of waiting out the round-trip.
     * Called synchronously once validation passes, with `run` wrapping the
     * actual submit (mutation + local state) - the caller must `await run()`
     * itself, inside a transition, for `useOptimistic`'s pending state to
     * last until it settles. Falls back to running inline when omitted.
     */
    onOptimisticSubmit?: (content: string, rating: number, run: () => Promise<void>) => void
}

interface ReviewFormValues {
    rating: number
    content: string
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ entityType, entityId, onSuccess, onOptimisticSubmit }) => {
    const { t } = useTranslation()

    const [hoverRating, setHoverRating] = useState<number>(0)
    const [submitError, setSubmitError] = useState<unknown>(undefined)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const [createComment, { isLoading }] = API.useCommentsCreateMutation()

    // Same rules as the old hand-rolled `validate()`: a rating is only
    // mandatory for event reviews, and content must be non-empty, then
    // within [MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH] once trimmed.
    // `superRefine` (rather than chained `.min()`s) mirrors the original
    // if/else-if branching exactly, so an empty string always reports
    // "required" rather than also tripping the "too short" check.
    const reviewSchema = useMemo(
        () =>
            z.object({
                rating: z.number().superRefine((value, ctx) => {
                    if (entityType === 'event' && value === 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('components.common.review-form.rating-required', 'Пожалуйста, выберите оценку')
                        })
                    }
                }),
                content: z
                    .string()
                    .trim()
                    .superRefine((value, ctx) => {
                        if (!value) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t(
                                    'components.common.review-form.content-required',
                                    'Пожалуйста, напишите отзыв'
                                )
                            })
                        } else if (value.length < MIN_CONTENT_LENGTH) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t(
                                    'components.common.review-form.content-too-short',
                                    'Отзыв должен содержать не менее {{min}} символов',
                                    { min: MIN_CONTENT_LENGTH }
                                )
                            })
                        } else if (value.length > MAX_CONTENT_LENGTH) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t(
                                    'components.common.review-form.content-too-long',
                                    'Отзыв не должен превышать {{max}} символов',
                                    { max: MAX_CONTENT_LENGTH }
                                )
                            })
                        }
                    })
            }),
        [t, entityType]
    )

    const {
        control,
        handleSubmit,
        setError,
        reset,
        formState: { errors: formErrors, isSubmitting }
    } = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewSchema),
        // Deliberately left at the RHF default (validate on submit, then
        // re-validate a field live once it has an error) rather than
        // `onChange` - the old hand-rolled `validate()` only ever ran at
        // submit time too, and with two independent fields `onChange` mode
        // would silently disable/clear an untouched sibling field's error
        // (e.g. a never-clicked rating) without ever surfacing it to the user.
        defaultValues: { rating: 0, content: '' }
    })

    const { message: apiErrorMessage, fieldErrors: apiFieldErrors } = useApiFormError(submitError)
    useSyncApiFieldErrors(apiFieldErrors, setError)

    const onValid = async ({ rating, content }: ReviewFormValues) => {
        setSubmitError(undefined)
        setSubmitSuccess(false)

        const run = async () => {
            try {
                await createComment({
                    content,
                    entityId,
                    entityType,
                    rating: rating > 0 ? rating : undefined
                }).unwrap()

                reset({ rating: 0, content: '' })
                setHoverRating(0)
                setSubmitSuccess(true)
                onSuccess?.()
            } catch (error) {
                setSubmitError(error)
            }
        }

        if (onOptimisticSubmit) {
            onOptimisticSubmit(content, rating, run)
        } else {
            await run()
        }
    }

    const disabled = isLoading || isSubmitting

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit(onValid)}
            noValidate={true}
        >
            <div className={styles.ratingGroup}>
                <span className={styles.ratingLabel}>{t('components.common.review-form.rating-label', 'Оценка')}</span>
                <Controller
                    name={'rating'}
                    control={control}
                    render={({ field }) => {
                        const activeRating = hoverRating || field.value

                        return (
                            <div
                                className={styles.stars}
                                role={'group'}
                                aria-label={t('components.common.review-form.rating-label', 'Оценка')}
                            >
                                {Array.from({ length: 5 }, (_, i) => {
                                    const value = i + 1
                                    return (
                                        <button
                                            key={value}
                                            type={'button'}
                                            disabled={disabled}
                                            className={value <= activeRating ? styles.starFilled : styles.starEmpty}
                                            aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                                            aria-pressed={field.value === value}
                                            onClick={() => {
                                                field.onChange(value)
                                                setSubmitSuccess(false)
                                            }}
                                            onMouseEnter={() => setHoverRating(value)}
                                            onMouseLeave={() => setHoverRating(0)}
                                        >
                                            {value <= activeRating ? '★' : '☆'}
                                        </button>
                                    )
                                })}
                            </div>
                        )
                    }}
                />
            </div>

            {formErrors.rating?.message && <span className={styles.fieldError}>{formErrors.rating.message}</span>}

            <Controller
                name={'content'}
                control={control}
                render={({ field }) => (
                    <TextArea
                        {...field}
                        rows={4}
                        autoResize={true}
                        disabled={disabled}
                        maxLength={MAX_CONTENT_LENGTH}
                        placeholder={t('components.common.review-form.placeholder', 'Поделитесь впечатлениями...')}
                        error={formErrors.content?.message}
                        onChange={(e) => {
                            field.onChange(e)
                            setSubmitSuccess(false)
                        }}
                    />
                )}
            />

            {!!submitError && (
                <Message type={'error'}>
                    {apiErrorMessage ||
                        t('components.common.review-form.error', 'Не удалось отправить отзыв. Попробуйте ещё раз.')}
                </Message>
            )}

            {submitSuccess && (
                <p className={styles.success}>{t('components.common.review-form.success', 'Отзыв опубликован!')}</p>
            )}

            <Button
                type={'submit'}
                mode={'primary'}
                size={'medium'}
                disabled={disabled}
                label={
                    disabled
                        ? t('common.loading', 'Загрузка...')
                        : t('components.common.review-form.submit', 'Отправить отзыв')
                }
            />
        </form>
    )
}
