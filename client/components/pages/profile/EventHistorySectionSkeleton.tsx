import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import styles from './styles.module.sass'
import eventRowStyles from '@/components/pages/stargazing/event-row/styles.module.sass'

interface EventHistorySectionSkeletonProps {
    count?: number
}

// Placeholder shown instead of the event history list while it's loading — reuses
// EventRow's own layout classes so the skeleton lines up pixel-for-pixel with the
// real row once data arrives (no visual jump).
export const EventHistorySectionSkeleton: React.FC<EventHistorySectionSkeletonProps> = ({ count = 2 }) => (
    <div className={styles.historyList}>
        {Array.from({ length: count }).map((_, index) => (
            <div
                key={index}
                className={eventRowStyles.eventRow}
            >
                <div className={eventRowStyles.primaryLink}>
                    <Skeleton style={{ width: '140px', height: '100px', flexShrink: 0 }} />
                    <div className={eventRowStyles.content}>
                        <Skeleton style={{ width: '70%', height: '15px' }} />
                        <Skeleton style={{ width: '140px', height: '13px' }} />
                    </div>
                </div>
                <Skeleton style={{ width: '80px', height: '13px' }} />
                <Skeleton style={{ width: '18px', height: '18px', flexShrink: 0 }} />
            </div>
        ))}
    </div>
)
