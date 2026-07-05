import React from 'react'
import { Button, cn, Container, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { hosts } from '@/api/constants'
import { StarRating } from '@/components/common/review-card/StarRating'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface MyReviewsSectionProps {
    userId: string
}

export const MyReviewsSection: React.FC<MyReviewsSectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useCommentsGetListQuery({ userId })
    const [deleteComment] = API.useCommentsDeleteMutation()

    if (isLoading) {
        return null
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.reviews-empty', 'Вы ещё не оставляли отзывов')}</p>
            </Container>
        )
    }

    return (
        <Container className={styles.reviewsList}>
            {data.items.map((review) => {
                const eventHref = review.entityId ? `/stargazing/${review.entityId}` : undefined
                const eventTitle = review.entity?.title

                return (
                    <div
                        key={review.id}
                        className={styles.reviewCard}
                    >
                        {eventHref ? (
                            <Link
                                href={eventHref}
                                className={cn(
                                    styles.reviewThumbnail,
                                    !review.entity?.coverFileName && styles.reviewThumbnailEmpty
                                )}
                            >
                                {review.entity?.coverFileName ? (
                                    <Image
                                        alt={eventTitle ?? ''}
                                        quality={70}
                                        width={120}
                                        height={90}
                                        src={`${hosts.stargazing}${review.entityId}/${review.entity.coverFileName}_preview.${review.entity.coverFileExt}`}
                                    />
                                ) : (
                                    <Icon
                                        name={'Moon'}
                                        aria-hidden
                                    />
                                )}
                            </Link>
                        ) : (
                            <div className={cn(styles.reviewThumbnail, styles.reviewThumbnailEmpty)}>
                                <Icon
                                    name={'Moon'}
                                    aria-hidden
                                />
                            </div>
                        )}

                        <div className={styles.reviewBody}>
                            <div className={styles.reviewHeader}>
                                {eventTitle &&
                                    (eventHref ? (
                                        <Link
                                            href={eventHref}
                                            className={styles.reviewTitle}
                                        >
                                            {eventTitle}
                                        </Link>
                                    ) : (
                                        <span className={styles.reviewTitle}>{eventTitle}</span>
                                    ))}
                                {review.entity?.date && (
                                    <time
                                        className={styles.reviewDate}
                                        dateTime={review.entity.date}
                                    >
                                        {formatDate(review.entity.date, 'D MMMM YYYY')}
                                    </time>
                                )}
                                {review.rating !== undefined && <StarRating rating={review.rating} />}
                            </div>
                            <p className={styles.reviewContent}>{review.content}</p>
                        </div>

                        <Button
                            size={'small'}
                            mode={'secondary'}
                            label={t('components.common.review-card.delete', 'Удалить')}
                            onClick={() => {
                                void deleteComment(review.id)
                            }}
                            className={styles.reviewDeleteButton}
                        />
                    </div>
                )
            })}
        </Container>
    )
}
