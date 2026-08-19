import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

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
    /** Set while this review is an optimistic entry still in flight - hides
     * the (not-yet-real) date/delete action and shows a "sending" label. */
    pending?: boolean
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, canDelete, className, onDelete, pending }) => {
    const { t } = useTranslation()

    return (
        <article className={cn(styles.card, pending && styles.cardPending, className)}>
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
                <div className={styles.headerAside}>
                    {pending ? (
                        <span className={styles.pendingLabel}>
                            {t('components.common.review-card.pending', 'Отправка…')}
                        </span>
                    ) : (
                        <time
                            className={styles.date}
                            dateTime={review.createdAt}
                        >
                            {formatDate(review.createdAt)}
                        </time>
                    )}
                    {canDelete && onDelete && !pending && (
                        <Button
                            size={'small'}
                            mode={'secondary'}
                            label={t('components.common.review-card.delete', 'Удалить')}
                            onClick={() => onDelete(review.id)}
                            className={styles.deleteButton}
                        />
                    )}
                </div>
            </header>

            <p className={styles.content}>{review.content}</p>
        </article>
    )
}
