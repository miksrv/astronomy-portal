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
    /** `quote` — a review on a landing: the stars, the words larger, then who wrote it and about
     * which trip (instead of the date); no actions */
    variant?: 'default' | 'quote'
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
    review,
    canDelete,
    className,
    onDelete,
    pending,
    variant = 'default'
}) => {
    const { t } = useTranslation()

    const avatar = (
        <UserAvatar
            src={review.author?.avatar ? `${HOST_IMG}/users/${review.author.id}/${review.author.avatar}` : undefined}
            name={review.author.name}
            size={'medium'}
        />
    )

    if (variant === 'quote') {
        return (
            <article className={cn(styles.quote, className)}>
                {review.rating !== undefined && <StarRating rating={review.rating} />}

                <blockquote className={styles.quoteText}>{review.content}</blockquote>

                <footer className={styles.quoteAuthor}>
                    {avatar}
                    <div className={styles.meta}>
                        <span className={styles.authorName}>{review.author.name}</span>
                        <span className={styles.quoteEvent}>
                            {review.entity?.title ?? formatDate(review.createdAt)}
                        </span>
                    </div>
                </footer>
            </article>
        )
    }

    return (
        <article className={cn(styles.card, pending && styles.cardPending, className)}>
            <header className={styles.header}>
                {avatar}
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
