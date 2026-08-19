import React, { startTransition, useEffect, useOptimistic, useRef, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { ReviewForm } from '@/components/common/review-form/ReviewForm'
import { REVIEW_INLINE_FORM_ID, REVIEWS_PAGE_SIZE } from '@/utils/constants'
import { hasPermission } from '@/utils/permissions'

import { EventReviewsSkeleton } from './EventReviewsSkeleton'
import { ReviewFloatingPrompt } from './ReviewFloatingPrompt'

import styles from './styles.module.sass'

interface EventReviewsProps {
    eventId: string
}

/** A review not yet confirmed by the server - rendered instantly via `useOptimistic`. */
type OptimisticReview = ApiModel.Comment & { pending?: boolean }

export const EventReviews: React.FC<EventReviewsProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const dispatch = useAppDispatch()

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

    // Shows the just-submitted review at the top instantly instead of a
    // generic skeleton placeholder. `items` (the real, server-confirmed list)
    // is always the base value here - the optimistic entry only survives for
    // the lifetime of the transition in `handleOptimisticSubmit` below.
    const [optimisticItems, addOptimisticReview] = useOptimistic<OptimisticReview[], OptimisticReview>(
        items,
        (state, review) => [review, ...state]
    )

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
            if (entry?.isIntersecting) {
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

    // Only the very first page fetch (no items yet) shows the full-list
    // skeleton; a fetch triggered by the sentinel while items are already on
    // screen gets the smaller "loading more" skeleton instead.
    const isInitialLoading = isFetching && items.length === 0
    const isLoadingMore = isFetching && items.length > 0

    const canDeleteReview = (review: OptimisticReview): boolean => {
        if (!user || review.pending) {
            return false
        }
        return user.id === review.author.id || hasPermission(user, ApiModel.Permission.COMMENTS_MODERATE)
    }

    // Renders the submitted review immediately (see `optimisticItems` above)
    // instead of the earlier generic skeleton placeholder. `addOptimisticReview`
    // must run in the same transition as the actual submit (`run`, from
    // ReviewForm) - once that settles, React reverts to `items` above, which
    // by then has the real, server-confirmed review thanks to the explicit
    // refetch below.
    const handleOptimisticSubmit = (content: string, rating: number, run: () => Promise<void>) => {
        startTransition(async () => {
            addOptimisticReview({
                id: `optimistic-${Date.now()}`,
                content,
                rating: rating > 0 ? rating : undefined,
                createdAt: new Date().toISOString(),
                entityId: eventId,
                entityType: 'event',
                author: {
                    id: user?.id ?? '',
                    name: user?.name ?? '',
                    avatar: user?.avatar
                },
                pending: true
            })

            await run()

            // `commentsCreate` invalidates the entity's Comments tag, but that
            // background refetch isn't awaited by the mutation itself - force
            // and await it explicitly so this transition doesn't end (and the
            // optimistic review with it) before the real list actually
            // contains the new review.
            await dispatch(
                API.endpoints.commentsGetList.initiate(
                    { entityId: eventId, entityType: 'event', limit: REVIEWS_PAGE_SIZE, offset: 0 },
                    { forceRefetch: true }
                )
            ).unwrap()
        })
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
                            onOptimisticSubmit={handleOptimisticSubmit}
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

                {optimisticItems.length > 0 ? (
                    <ul className={styles.list}>
                        {optimisticItems.map((review) => (
                            <li key={review.id}>
                                <ReviewCard
                                    review={review}
                                    canDelete={canDeleteReview(review)}
                                    pending={review.pending}
                                    onDelete={(id) => {
                                        void deleteComment(id)
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                ) : isInitialLoading ? (
                    <EventReviewsSkeleton />
                ) : (
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
