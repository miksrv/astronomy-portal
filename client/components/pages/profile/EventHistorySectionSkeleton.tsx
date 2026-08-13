import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface EventHistorySectionSkeletonProps {
    count?: number
}

// Placeholder shown instead of the event history list while it's loading - mirrors
// EventHistorySection's layout (thumbnail + title/date/location, then status column)
// so the loading state doesn't cause a visual jump once data arrives.
export const EventHistorySectionSkeleton: React.FC<EventHistorySectionSkeletonProps> = ({ count = 2 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <div
                key={index}
                className={styles.historyCard}
            >
                <Skeleton style={{ width: '120px', height: '90px', flexShrink: 0 }} />
                <div className={styles.historyContent}>
                    <Skeleton style={{ width: '70%', height: '15px' }} />
                    <Skeleton style={{ width: '140px', height: '13px' }} />
                    <Skeleton style={{ width: '100px', height: '13px' }} />
                </div>
                <Skeleton style={{ width: '18px', height: '18px', flexShrink: 0 }} />
            </div>
        ))}
    </>
)
