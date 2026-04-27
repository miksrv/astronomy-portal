import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { ReviewForm } from '@/components/common/review-form/ReviewForm'

import styles from './styles.module.sass'

interface EventReviewsProps {
    eventId: string
}

export const EventReviews: React.FC<EventReviewsProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const isAuth = useAppSelector((state) => state.auth.isAuth)
    const user = useAppSelector((state) => state.auth.user)

    const { data } = API.useCommentsGetListQuery({ entityId: eventId, entityType: 'event' })
    const [deleteComment] = API.useCommentsDeleteMutation()

    const items = data?.items ?? []

    const canReview = data?.canReview ?? false
    const hasReviewed = data?.hasReviewed ?? false
    const showForm = isAuth && canReview && !hasReviewed

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
        <Container>
            {showForm && (
                <div className={styles.formWrapper}>
                    <ReviewForm
                        entityType={'event'}
                        entityId={eventId}
                    />
                </div>
            )}

            {isAuth && !canReview && !hasReviewed && (
                <p className={styles.infoText}>
                    {t(
                        'components.common.review-form.not-eligible',
                        'Вы сможете оставить отзыв после посещения события'
                    )}
                </p>
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
            ) : (
                <p className={styles.empty}>
                    {t('components.common.reviews-section.empty', 'Отзывов пока нет. Будьте первым!')}
                </p>
            )}
        </Container>
    )
}
