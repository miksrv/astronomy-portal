import React, { useState } from 'react'
import { Button, Message, TextArea } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { useApiFormError } from '@/hooks/useApiFormError'

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

export const ReviewForm: React.FC<ReviewFormProps> = ({ entityType, entityId, onSuccess, onOptimisticSubmit }) => {
    const { t } = useTranslation()

    const [rating, setRating] = useState<number>(0)
    const [hoverRating, setHoverRating] = useState<number>(0)
    const [content, setContent] = useState<string>('')
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [submitError, setSubmitError] = useState<unknown>(undefined)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const [createComment, { isLoading }] = API.useCommentsCreateMutation()

    const { message: apiErrorMessage, fieldErrors: apiFieldErrors } = useApiFormError(submitError)

    const ratingError = validationErrors.rating || apiFieldErrors.rating
    const contentError = validationErrors.content || apiFieldErrors.content

    const validate = (trimmedContent: string): Record<string, string> => {
        const errors: Record<string, string> = {}

        if (entityType === 'event' && rating === 0) {
            errors.rating = t('components.common.review-form.rating-required', 'Пожалуйста, выберите оценку')
        }

        if (!trimmedContent) {
            errors.content = t('components.common.review-form.content-required', 'Пожалуйста, напишите отзыв')
        } else if (trimmedContent.length < MIN_CONTENT_LENGTH) {
            errors.content = t(
                'components.common.review-form.content-too-short',
                'Отзыв должен содержать не менее {{min}} символов',
                { min: MIN_CONTENT_LENGTH }
            )
        } else if (trimmedContent.length > MAX_CONTENT_LENGTH) {
            errors.content = t(
                'components.common.review-form.content-too-long',
                'Отзыв не должен превышать {{max}} символов',
                { max: MAX_CONTENT_LENGTH }
            )
        }

        return errors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedContent = content.trim()
        const errors = validate(trimmedContent)

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            setSubmitSuccess(false)
            return
        }

        setValidationErrors({})
        setSubmitError(undefined)
        setSubmitSuccess(false)

        const run = async () => {
            try {
                await createComment({
                    content: trimmedContent,
                    entityId,
                    entityType,
                    rating: rating > 0 ? rating : undefined
                }).unwrap()

                setContent('')
                setRating(0)
                setHoverRating(0)
                setSubmitSuccess(true)
                onSuccess?.()
            } catch (error) {
                setSubmitError(error)
            }
        }

        if (onOptimisticSubmit) {
            onOptimisticSubmit(trimmedContent, rating, run)
        } else {
            await run()
        }
    }

    const activeRating = hoverRating || rating

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
        >
            <div className={styles.ratingGroup}>
                <span className={styles.ratingLabel}>{t('components.common.review-form.rating-label', 'Оценка')}</span>
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
                                disabled={isLoading}
                                className={value <= activeRating ? styles.starFilled : styles.starEmpty}
                                aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                                aria-pressed={rating === value}
                                onClick={() => {
                                    setRating(value)
                                    setValidationErrors(({ rating: _rating, ...rest }) => rest)
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
            </div>

            {ratingError && <span className={styles.fieldError}>{ratingError}</span>}

            <TextArea
                rows={4}
                autoResize={true}
                disabled={isLoading}
                value={content}
                maxLength={MAX_CONTENT_LENGTH}
                placeholder={t('components.common.review-form.placeholder', 'Поделитесь впечатлениями...')}
                error={contentError}
                onChange={(e) => {
                    setContent(e.target.value)
                    setValidationErrors(({ content: _content, ...rest }) => rest)
                    setSubmitSuccess(false)
                }}
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
                disabled={isLoading}
                label={
                    isLoading
                        ? t('common.loading', 'Загрузка...')
                        : t('components.common.review-form.submit', 'Отправить отзыв')
                }
            />
        </form>
    )
}
