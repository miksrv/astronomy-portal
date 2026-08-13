import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface EventReviewsSkeletonProps {
    count?: number
}

// Placeholder shown instead of <Spinner /> while reviews are loading - both on
// the very first load and while the next page is being fetched during
// infinite scroll. Mirrors ReviewCard's layout (avatar + name/rating + date +
// text lines) so the loading state doesn't cause a visual jump once the real
// data arrives.
export const EventReviewsSkeleton: React.FC<EventReviewsSkeletonProps> = ({ count = 3 }) => (
    <ul className={styles.list}>
        {Array.from({ length: count }).map((_, index) => (
            <li key={index}>
                <div className={styles.skeletonCard}>
                    <div className={styles.skeletonHeader}>
                        <Skeleton style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                        <div className={styles.skeletonMeta}>
                            <Skeleton style={{ width: '120px', height: '13px' }} />
                            <Skeleton style={{ width: '70px', height: '12px' }} />
                        </div>
                        <Skeleton style={{ width: '60px', height: '12px', flexShrink: 0 }} />
                    </div>
                    <Skeleton style={{ width: '100%', height: '14px' }} />
                    <Skeleton style={{ width: '70%', height: '14px' }} />
                </div>
            </li>
        ))}
    </ul>
)
