import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { ApiModel, HOST_IMG } from '@/api'
import { UserAvatar } from '@/components/ui/user-avatar/UserAvatar'
import { formatDate } from '@/utils/dates'

import { StarRating } from './StarRating'

import styles from './styles.module.sass'

interface ReviewCardProps {
    review: ApiModel.Comment
    canDelete?: boolean
    className?: string
    onDelete?: (id: string) => void
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, canDelete, className, onDelete }) => {
    const { t } = useTranslation()

    return (
        <article className={cn(styles.card, className)}>
            <header className={styles.header}>
                <UserAvatar
                    src={
                        review.author?.avatar
                            ? `${HOST_IMG}/users/${review.author.id}/${review.author.avatar}`
                            : undefined
                    }
                    name={review.author.name}
                    size={'medium'}
                />
                <div className={styles.meta}>
                    <span className={styles.authorName}>{review.author.name}</span>
                    {review.rating !== undefined && <StarRating rating={review.rating} />}
                </div>
                {canDelete && onDelete && (
                    <Button
                        size={'small'}
                        mode={'secondary'}
                        label={t('components.common.review-card.delete', 'Удалить')}
                        onClick={() => onDelete(review.id)}
                        className={styles.deleteButton}
                    />
                )}
            </header>

            <p className={styles.content}>{review.content}</p>

            <time
                className={styles.date}
                dateTime={review.createdAt}
            >
                {formatDate(review.createdAt)}
            </time>
        </article>
    )
}
