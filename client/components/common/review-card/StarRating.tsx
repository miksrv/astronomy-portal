import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StarRatingProps {
    rating: number
}

export const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
    const { t } = useTranslation()

    return (
        <span
            role={'img'}
            className={styles.stars}
            aria-label={t('components.common.review-card.rating', 'Оценка {{rating}} из 5', { rating })}
        >
            {Array.from({ length: 5 }, (_, i) => (
                <span
                    key={i}
                    className={i < rating ? styles.starFilled : styles.starEmpty}
                >
                    {i < rating ? '★' : '☆'}
                </span>
            ))}
        </span>
    )
}
