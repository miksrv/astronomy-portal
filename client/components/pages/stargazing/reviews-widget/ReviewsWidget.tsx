import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { RatingSummary } from '@/components/common/review-card/RatingSummary'
import { ReviewCard } from '@/components/common/review-card/ReviewCard'
import { Carousel, LandingSection } from '@/components/ui'

import styles from './styles.module.sass'

/**
 * The reviews of the landing: random ones among the best (five stars) and fullest (three lines at
 * least, so the cards of a row are filled alike), the same arguments on the server (prefetch) and here
 */
export const STARGAZING_REVIEWS_QUERY = { entityType: 'event', limit: 9, minRating: 5, minLength: 120 } as const

export const ReviewsWidget: React.FC = () => {
    const { t } = useTranslation()

    const { data } = API.useCommentsGetRandomQuery(STARGAZING_REVIEWS_QUERY)

    const items = data?.items ?? []

    if (!items.length) {
        return null
    }

    return (
        <LandingSection
            kicker={t('pages.stargazing.reviews-kicker', 'Отзывы')}
            title={t('pages.stargazing.reviews-title', 'Что говорят')}
            accent={t('pages.stargazing.reviews-accent', 'участники')}
            aside={<RatingSummary summary={data?.summary} />}
        >
            <Carousel
                options={{ dragFree: true }}
                className={styles.carousel}
                containerClassName={styles.carouselContainer}
            >
                {items.map((review) => (
                    <div key={review.id}>
                        <ReviewCard
                            review={review}
                            variant={'quote'}
                        />
                    </div>
                ))}
            </Carousel>
        </LandingSection>
    )
}
