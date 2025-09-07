import React, { useState } from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import styles from './styles.module.sass'

interface ShowMoreProps {
    children?: React.ReactNode
}

export const ShowMore: React.FC<ShowMoreProps> = ({ children }) => {
    const { t } = useTranslation()
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
                {isExpanded
                    ? t('components.ui.show-more.show-less', 'Показать меньше')
                    : t('components.ui.show-more.show-more', 'Показать больше')}
            </Button>
        </div>
    )
}
