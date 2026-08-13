import React, { useEffect, useRef, useState } from 'react'
import { Container, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { ReviewForm } from '@/components/common/review-form/ReviewForm'
import { REVIEW_INLINE_FORM_ID, REVIEWS_PAGE_SIZE } from '@/utils/constants'

import { ReviewFloatingPrompt } from './ReviewFloatingPrompt'

import styles from './styles.module.sass'

interface EventReviewsProps {
    eventId: string
}

export const EventReviews: React.FC<EventReviewsProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const isAuth = useAppSelector((state) => state.auth.isAuth)
    const user = useAppSelector((state) => state.auth.user)

    const [offset, setOffset] = useState(0)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    // Reset back to the first page whenever the event itself changes, so a
    // stale accumulated list from a previous event id can't leak in.
    useEffect(() => {
        setOffset(0)
    }, [eventId])

    const { data, isFetching } = API.useCommentsGetListQuery({
        entityId: eventId,
        entityType: 'event',
        limit: REVIEWS_PAGE_SIZE,
        offset
    })
    const [deleteComment] = API.useCommentsDeleteMutation()

    const items = data?.items ?? []
    const hasMore = items.length < (data?.total ?? 0)

    // Load the next page once the sentinel below the list scrolls into view -
    // skipped while a fetch is already in flight or there's nothing more.
    useEffect(() => {
        if (!hasMore || isFetching || typeof IntersectionObserver === 'undefined') {
            return
        }

        const sentinel = sentinelRef.current

        if (!sentinel) {
            return
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setOffset(items.length)
            }
        })

        observer.observe(sentinel)

        return () => observer.disconnect()
    }, [hasMore, isFetching, items.length])

    const canReview = data?.canReview ?? false
    const hasReviewed = data?.hasReviewed ?? false
    const showForm = isAuth && canReview && !hasReviewed
    const showNotEligible = isAuth && !canReview && !hasReviewed
    const showTopSection = showForm || showNotEligible

    const canDeleteReview = (review: ApiModel.Comment): boolean => {
        if (!user) {
            return false
        }
        return (
            user.id === review.author.id ||
            user.role === ApiModel.UserRole.ADMIN ||
            user.role === ApiModel.UserRole.MODERATOR
        )
    }

    return (
        <>
            <Container>
                {showForm && (
                    <div
                        id={REVIEW_INLINE_FORM_ID}
                        className={styles.formWrapper}
                    >
                        <ReviewForm
                            entityType={'event'}
                            entityId={eventId}
                        />
                    </div>
                )}

                {showNotEligible && (
                    <p className={styles.infoText}>
                        {t(
                            'components.common.review-form.not-eligible',
                            'Вы сможете оставить отзыв после посещения события'
                        )}
                    </p>
                )}

                {showTopSection && <hr className={styles.divider} />}

                {items.length > 0 ? (
                    <ul className={styles.list}>
                        {items.map((review) => (
                            <li key={review.id}>
                                <ReviewCard
                                    review={review}
                                    canDelete={canDeleteReview(review)}
                                    onDelete={(id) => {
                                        void deleteComment(id)
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    !isFetching && (
                        <p className={styles.empty}>
                            {t('components.common.reviews-section.empty', 'Отзывов пока нет. Будьте первым!')}
                        </p>
                    )
                )}

                {(hasMore || (isFetching && items.length === 0)) && (
                    <div
                        ref={sentinelRef}
                        className={styles.loadMoreSentinel}
                    >
                        {isFetching && <Spinner />}
                    </div>
                )}
            </Container>

            <ReviewFloatingPrompt
                eventId={eventId}
                show={showForm}
            />
        </>
    )
}
