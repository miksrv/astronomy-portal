import React, { useState } from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import styles from './styles.module.sass'

interface ShowMoreProps {
    content?: React.ReactNode
}

export const ShowMore: React.FC<ShowMoreProps> = ({ content }) => {
    const { t } = useTranslation()
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className={cn(styles.showMore, isExpanded && styles.expanded)}>
            <div className={styles.content}>{content}</div>
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
