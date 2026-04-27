import React from 'react'
import { Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { ReviewCard } from '@/components/common'

import styles from './styles.module.sass'

interface MyReviewsSectionProps {
    userId: string
}

export const MyReviewsSection: React.FC<MyReviewsSectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useCommentsGetListQuery({ userId })
    const [deleteComment] = API.useCommentsDeleteMutation()

    if (isLoading) {
        return null
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.reviews-empty', 'Вы ещё не оставляли отзывов')}</p>
            </Container>
        )
    }

    return (
        <Container>
            <div className={styles.reviewsList}>
                {data.items.map((review) => (
                    <div
                        key={review.id}
                        className={styles.reviewItem}
                    >
                        <ReviewCard
                            review={review}
                            canDelete={true}
                            onDelete={(id) => {
                                void deleteComment(id)
                            }}
                        />
                        {review.entityId && (
                            <Link
                                href={`/stargazing/${review.entityId}`}
                                className={styles.reviewEventLink}
                            >
                                {t('pages.profile.reviews-view-event', 'Посмотреть мероприятие')} →
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </Container>
    )
}
