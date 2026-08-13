import React, { useEffect, useRef, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { ReviewForm } from '@/components/common/review-form/ReviewForm'
import { REVIEW_INLINE_FORM_ID, REVIEWS_PAGE_SIZE } from '@/utils/constants'

import { EventReviewsSkeleton } from './EventReviewsSkeleton'
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
    // Sidesteps the round-trip to `hasReviewed` refetching: hides the form the
    // instant a review is posted instead of waiting for the network.
    const [justPosted, setJustPosted] = useState(false)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    // Reset back to the first page whenever the event itself changes, so a
    // stale accumulated list from a previous event id can't leak in.
    useEffect(() => {
        setOffset(0)
        setJustPosted(false)
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

    // Once the post-submit refetch (triggered by `handleReviewSuccess` below)
    // has landed, `justPosted` has done its job - hasReviewed now covers
    // hiding the form on its own, so let it go rather than have it linger
    // forever (e.g. blocking the form if a review is later removed).
    useEffect(() => {
        if (justPosted && !isFetching) {
            setJustPosted(false)
        }
    }, [justPosted, isFetching])

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
    const showForm = isAuth && canReview && !hasReviewed && !justPosted
    const showNotEligible = isAuth && !canReview && !hasReviewed
    const showTopSection = showForm || showNotEligible

    // The list itself refreshes on its own - `commentsCreate` invalidates the
    // entity's Comments tag, so RTK Query refetches this query in the
    // background and the new review (newest-first on the backend) lands at
    // the top. Jumping back to the first page here just guards the case where
    // the user had scrolled further down before posting: without it, the
    // background refetch would reload whatever page was last in view instead
    // of the first one.
    const handleReviewSuccess = () => {
        setJustPosted(true)
        setOffset(0)
    }

    // While the post-submit refetch is in flight, show a single-card skeleton
    // above the (still-stale) list as a placeholder for the incoming review -
    // takes priority over the initial-load / load-more skeletons below, which
    // would otherwise also match during this same window.
    const isPostingRefresh = justPosted && isFetching

    // Only the very first page fetch (no items yet) shows the full-list
    // skeleton; a fetch triggered by the sentinel while items are already on
    // screen gets the smaller "loading more" skeleton instead.
    const isInitialLoading = isFetching && items.length === 0 && !isPostingRefresh
    const isLoadingMore = isFetching && items.length > 0 && !isPostingRefresh

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
                            onSuccess={handleReviewSuccess}
                        />
                    </div>
                )}

                {showNotEligible && (
                    <div className={styles.infoBlock}>
                        <p className={styles.infoTitle}>
                            {t(
                                'components.common.review-form.not-eligible-title',
                                'Отзыв могут оставить только участники'
                            )}
                        </p>
                        <p className={styles.infoText}>
                            {t(
                                'components.common.review-form.not-eligible',
                                'Оставить отзыв может любой, кто был зарегистрирован на этот астровыезд'
                            )}
                        </p>
                    </div>
                )}

                {showTopSection && <hr className={styles.divider} />}

                {isPostingRefresh && (
                    <div className={styles.postingSkeleton}>
                        <EventReviewsSkeleton count={1} />
                    </div>
                )}

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
                ) : isInitialLoading ? (
                    <EventReviewsSkeleton />
                ) : isPostingRefresh ? null : (
                    <p className={styles.empty}>
                        {t('components.common.reviews-section.empty', 'Отзывов пока нет. Будьте первым!')}
                    </p>
                )}

                {hasMore && (
                    <div
                        ref={sentinelRef}
                        className={styles.loadMoreSentinel}
                    >
                        {isLoadingMore && <EventReviewsSkeleton count={2} />}
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
