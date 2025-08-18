import React, { useState } from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface ShowMoreProps {
    children?: React.ReactNode
}

export const ShowMore: React.FC<ShowMoreProps> = ({ children }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className={styles.showMore}>
            <div className={cn(styles.content, isExpanded && styles.expanded)}>{children}</div>
            <Button
                className={styles.showMoreButton}
                mode={'secondary'}
                size={'medium'}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? 'Показать меньше' : 'Показать больше'}
            </Button>
        </div>
    )
}
