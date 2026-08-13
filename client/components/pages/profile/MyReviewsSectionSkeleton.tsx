import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface MyReviewsSectionSkeletonProps {
    count?: number
}

// Placeholder shown instead of the review list while it's loading - mirrors
// MyReviewsSection's layout (title + date + rating + delete button, then
// text) so the loading state doesn't cause a visual jump once data arrives.
export const MyReviewsSectionSkeleton: React.FC<MyReviewsSectionSkeletonProps> = ({ count = 2 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <div
                key={index}
                className={styles.reviewItem}
            >
                <div className={styles.reviewHeader}>
                    <Skeleton style={{ width: '160px', height: '15px' }} />
                    <Skeleton style={{ width: '90px', height: '13px' }} />
                    <Skeleton style={{ width: '70px', height: '13px' }} />
                    <Skeleton style={{ width: '70px', height: '28px', marginLeft: 'auto', flexShrink: 0 }} />
                </div>
                <Skeleton style={{ width: '100%', height: '14px' }} />
                <Skeleton style={{ width: '60%', height: '14px', marginTop: '4px' }} />
            </div>
        ))}
    </>
)
