import React, { useState } from 'react'
import { Button, TextArea } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { API, ApiModel } from '@/api'

import styles from './styles.module.sass'

interface ReviewFormProps {
    entityType: ApiModel.CommentEntityType
    entityId: string
    onSuccess?: () => void
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ entityType, entityId, onSuccess }) => {
    const { t } = useTranslation()

    const [rating, setRating] = useState<number>(0)
    const [hoverRating, setHoverRating] = useState<number>(0)
    const [content, setContent] = useState<string>('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const [createComment, { isLoading }] = API.useCommentsCreateMutation()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFieldErrors({})
        setSubmitSuccess(false)

        try {
            await createComment({
                content,
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
            const messages =
                (error as { data?: { messages?: Record<string, string> } })?.data?.messages ??
                (error as { messages?: Record<string, string> })?.messages

            if (messages && typeof messages === 'object') {
                setFieldErrors(messages)
            } else {
                setFieldErrors({
                    _general: t(
                        'components.common.review-form.error',
                        'Не удалось отправить отзыв. Попробуйте ещё раз.'
                    )
                })
            }
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
                                className={value <= activeRating ? styles.starFilled : styles.starEmpty}
                                aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                                aria-pressed={rating === value}
                                onClick={() => setRating(value)}
                                onMouseEnter={() => setHoverRating(value)}
                                onMouseLeave={() => setHoverRating(0)}
                            >
                                {value <= activeRating ? '★' : '☆'}
                            </button>
                        )
                    })}
                </div>
            </div>

            {fieldErrors.rating && <span className={styles.fieldError}>{fieldErrors.rating}</span>}

            <TextArea
                rows={4}
                required={true}
                autoResize={true}
                value={content}
                placeholder={t('components.common.review-form.placeholder', 'Поделитесь впечатлениями...')}
                error={fieldErrors.content}
                onChange={(e) => setContent(e.target.value)}
            />

            {(fieldErrors._general || submitSuccess) && (
                <>
                    {fieldErrors._general && <p className={styles.fieldError}>{fieldErrors._general}</p>}
                    {submitSuccess && (
                        <p className={styles.success}>
                            {t('components.common.review-form.success', 'Отзыв опубликован!')}
                        </p>
                    )}
                </>
            )}

            <Button
                type={'submit'}
                mode={'primary'}
                size={'medium'}
                disabled={isLoading || !content.trim()}
                label={
                    isLoading
                        ? t('common.loading', 'Загрузка...')
                        : t('components.common.review-form.submit', 'Отправить отзыв')
                }
            />
        </form>
    )
}
