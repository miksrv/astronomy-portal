import React, { useEffect, useState } from 'react'
import { getCookie, setCookie } from 'cookies-next'
import { Button, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ReviewForm } from '@/components/common/review-form/ReviewForm'
import {
    COOKIE_CONSENT_BANNER_ID,
    COOKIE_CONSENT_DISMISSED_EVENT,
    REVIEW_INLINE_FORM_ID,
    REVIEW_PROMPT_DISMISS_COOKIE_PREFIX,
    REVIEW_PROMPT_DISMISS_DURATION
} from '@/utils/constants'

import styles from './styles.module.sass'

// Base gap (px) kept between the panel and the viewport edges; also the
// starting point when stacking above the cookie-consent banner.
const BASE_OFFSET = 16

// How long the "Спасибо за ваш отзыв" confirmation stays up before the
// panel auto-closes itself.
const THANKS_DURATION = 3000

interface ReviewFloatingPromptProps {
    eventId: string
    // Whether the user is eligible to leave a review and hasn't yet - mirrors
    // EventReviews' own `showForm` so both instances stay in sync.
    show: boolean
}

/**
 * Persistent bottom-of-viewport reminder to leave a review, shown on top of
 * the regular in-page review form so it doesn't get missed by users who
 * don't scroll all the way down. Reuses ReviewForm; on successful submission
 * it swaps the form for a brief "Спасибо за ваш отзыв" confirmation and
 * auto-closes after THANKS_DURATION rather than disappearing instantly (the
 * parent's `show` typically flips false around the same time anyway, once
 * `hasReviewed` refetches). It otherwise hides itself when dismissed (in
 * which case it stays hidden for REVIEW_PROMPT_DISMISS_DURATION via a
 * cookie), or when the user scrolls down far enough to see the permanent
 * in-page form - reappearing once that form scrolls back out of view.
 */
export const ReviewFloatingPrompt: React.FC<ReviewFloatingPromptProps> = ({ eventId, show }) => {
    const { t } = useTranslation()

    const dismissCookieName = `${REVIEW_PROMPT_DISMISS_COOKIE_PREFIX}${eventId}`

    const [dismissed, setDismissed] = useState<boolean | null>(null)
    const [bottomOffset, setBottomOffset] = useState(BASE_OFFSET)
    const [inlineFormVisible, setInlineFormVisible] = useState(false)
    const [justSubmitted, setJustSubmitted] = useState(false)

    useEffect(() => {
        setDismissed(!!getCookie(dismissCookieName))
    }, [dismissCookieName])

    // Hide the reminder while the permanent in-page form is itself visible
    // (no point showing both at once) - it reappears once that form scrolls
    // back out of view, e.g. when the user scrolls back up.
    useEffect(() => {
        if (!show || typeof IntersectionObserver === 'undefined') {
            return
        }

        const inlineForm = document.getElementById(REVIEW_INLINE_FORM_ID)

        if (!inlineForm) {
            return
        }

        const observer = new IntersectionObserver(([entry]) => setInlineFormVisible(entry?.isIntersecting ?? false))

        observer.observe(inlineForm)

        return () => observer.disconnect()
    }, [show])

    // Keep clear of the cookie-consent banner when it's also pinned to the
    // bottom of the page - read its rendered height rather than assuming a
    // fixed value, since it wraps to more lines on narrow screens.
    useEffect(() => {
        const recalcOffset = () => {
            const banner = document.getElementById(COOKIE_CONSENT_BANNER_ID)
            setBottomOffset(banner ? banner.offsetHeight + BASE_OFFSET : BASE_OFFSET)
        }

        recalcOffset()

        window.addEventListener('resize', recalcOffset)
        window.addEventListener(COOKIE_CONSENT_DISMISSED_EVENT, recalcOffset)

        return () => {
            window.removeEventListener('resize', recalcOffset)
            window.removeEventListener(COOKIE_CONSENT_DISMISSED_EVENT, recalcOffset)
        }
    }, [])

    // Auto-close the "Спасибо" confirmation a few seconds after submission,
    // instead of relying on `show` (which flips false once the parent
    // refetches `hasReviewed`, but not necessarily right away).
    useEffect(() => {
        if (!justSubmitted) {
            return
        }

        const timer = setTimeout(() => setJustSubmitted(false), THANKS_DURATION)

        return () => clearTimeout(timer)
    }, [justSubmitted])

    const handleClose = () => {
        void setCookie(dismissCookieName, '1', { maxAge: REVIEW_PROMPT_DISMISS_DURATION })
        setDismissed(true)
    }

    // dismissed === null means the cookie check hasn't run yet (SSR/first
    // paint) - stay hidden until it has, to avoid a flash of the panel.
    // `justSubmitted` overrides all of that so the thank-you confirmation
    // stays visible for its full duration even as `show`/`hasReviewed`
    // change underneath it.
    if (!justSubmitted && (!show || dismissed !== false || inlineFormVisible)) {
        return null
    }

    return (
        <div
            className={styles.floatingPrompt}
            style={{ bottom: bottomOffset }}
            role={'complementary'}
            aria-label={
                justSubmitted
                    ? t('components.common.review-form.floating-thanks', 'Спасибо за ваш отзыв!')
                    : t('components.common.review-form.floating-title', 'Оставьте отзыв о мероприятии')
            }
        >
            {!justSubmitted && (
                <Button
                    unstyled
                    icon={'Close'}
                    className={styles.floatingClose}
                    aria-label={t('components.common.review-form.floating-close', 'Закрыть напоминание об отзыве')}
                    onClick={handleClose}
                />
            )}

            {justSubmitted ? (
                <div className={styles.floatingThanks}>
                    <Icon
                        name={'CheckCircle'}
                        className={styles.floatingThanksIcon}
                    />
                    <p className={styles.floatingThanksText}>
                        {t('components.common.review-form.floating-thanks', 'Спасибо за ваш отзыв!')}
                    </p>
                </div>
            ) : (
                <>
                    <p className={styles.floatingTitle}>
                        {t('components.common.review-form.floating-title', 'Оставьте отзыв о мероприятии')}
                    </p>

                    <ReviewForm
                        entityType={'event'}
                        entityId={eventId}
                        onSuccess={() => setJustSubmitted(true)}
                    />
                </>
            )}
        </div>
    )
}
