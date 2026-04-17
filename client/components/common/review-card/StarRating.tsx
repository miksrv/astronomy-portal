import React from 'react'

import styles from './styles.module.sass'

interface StarRatingProps {
    rating: number
}

export const StarRating: React.FC<StarRatingProps> = ({ rating }) => (
    <span
        className={styles.stars}
        aria-label={`${rating} out of 5 stars`}
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
