import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { API } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'

import styles from './styles.module.sass'

export const ReviewsWidget: React.FC = () => {
    const { t } = useTranslation()

    const { data } = API.useCommentsGetRandomQuery({ entityType: 'event', limit: 5 })

    const items = data?.items ?? []

    if (!items.length) {
        return null
    }

    return (
        <Container className={styles.widget}>
            <h2 className={styles.title}>{t('components.common.reviews-widget.title', 'Participant Reviews')}</h2>
            <ul className={styles.grid}>
                {items.map((review) => (
                    <li key={review.id}>
                        <ReviewCard
                            review={review}
                            canDelete={false}
                        />
                    </li>
                ))}
            </ul>
        </Container>
    )
}
