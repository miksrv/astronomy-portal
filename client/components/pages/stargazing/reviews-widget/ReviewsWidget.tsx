import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { API } from '@/api'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { Carousel } from '@/components/ui'

import styles from './styles.module.sass'

export const ReviewsWidget: React.FC = () => {
    const { t } = useTranslation()

    const { data } = API.useCommentsGetRandomQuery({ entityType: 'event', limit: 10 })

    const items = data?.items ?? []

    if (!items.length) {
        return null
    }

    return (
        <>
            <h2>{t('pages.stargazing.reviews', 'Отзывы участников')}</h2>

            <Carousel
                options={{ dragFree: true }}
                className={styles.carousel}
                containerClassName={styles.carouselContainer}
            >
                {items.map((review) => (
                    <Container key={review.id}>
                        <ReviewCard
                            review={review}
                            className={styles.review}
                            canDelete={false}
                        />
                    </Container>
                ))}
            </Carousel>
        </>
    )
}
