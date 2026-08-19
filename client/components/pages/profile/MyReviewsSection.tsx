import React, { useState } from 'react'
import { Button, Container, Message } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { StarRating } from '@/components/common/review-card/StarRating'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

import { MyReviewsSectionSkeleton } from './MyReviewsSectionSkeleton'

import styles from './styles.module.sass'

interface MyReviewsSectionProps {
    userId?: string
}

export const MyReviewsSection: React.FC<MyReviewsSectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useCommentsGetListQuery({ userId: userId! }, { skip: !userId })
    const [deleteComment, { isLoading: isDeleting }] = API.useCommentsDeleteMutation()

    // The mutation hook's `isLoading`/`error` reflect only the most recently
    // triggered call, so track which row is in flight (and its error)
    // ourselves to keep concurrent per-row delete buttons from stepping on
    // each other's state.
    const [deletingId, setDeletingId] = useState<string | undefined>(undefined)
    const [deleteError, setDeleteError] = useState<{ id: string; error: unknown } | undefined>(undefined)

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        setDeleteError(undefined)

        try {
            await deleteComment(id).unwrap()
        } catch (error) {
            setDeleteError({ error, id })
        } finally {
            setDeletingId(undefined)
        }
    }

    if (isLoading) {
        return (
            <Container className={styles.reviewsList}>
                <MyReviewsSectionSkeleton />
            </Container>
        )
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.reviews-empty', 'Вы ещё не оставляли отзывов')}</p>
            </Container>
        )
    }

    return (
        <Container className={styles.reviewsList}>
            {data.items.map((review) => {
                const eventHref = review.entityId ? `/stargazing/${review.entityId}` : undefined
                const eventTitle = review.entity?.title

                return (
                    <div
                        key={review.id}
                        className={styles.reviewItem}
                    >
                        <div className={styles.reviewHeader}>
                            {eventTitle &&
                                (eventHref ? (
                                    <Link
                                        href={eventHref}
                                        className={styles.reviewTitle}
                                    >
                                        {eventTitle}
                                    </Link>
                                ) : (
                                    <span className={styles.reviewTitle}>{eventTitle}</span>
                                ))}
                            {review.entity?.date && (
                                <time
                                    className={styles.reviewDate}
                                    dateTime={review.entity.date}
                                >
                                    {formatDate(review.entity.date, 'D MMMM YYYY')}
                                </time>
                            )}
                            {review.rating !== undefined && <StarRating rating={review.rating} />}
                            <Button
                                size={'small'}
                                mode={'secondary'}
                                label={t('components.common.review-card.delete', 'Удалить')}
                                loading={isDeleting && deletingId === review.id}
                                disabled={isDeleting}
                                onClick={() => {
                                    void handleDelete(review.id)
                                }}
                                className={styles.reviewDeleteButton}
                            />
                        </div>
                        <p className={styles.reviewContent}>{review.content}</p>
                        {deleteError?.id === review.id && (
                            <Message type={'error'}>
                                {getErrorMessage(deleteError.error) ||
                                    t('pages.profile.review-delete-error', 'Не удалось удалить отзыв')}
                            </Message>
                        )}
                    </div>
                )
            })}
        </Container>
    )
}
