import { TFunction } from 'i18next'
import { z } from 'zod'

import { ApiModel } from '@/api'

import { MAX_CONTENT_LENGTH, MIN_CONTENT_LENGTH } from './constants'

// Same rules as the old hand-rolled `validate()`: a rating is only
// mandatory for event reviews, and content must be non-empty, then
// within [MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH] once trimmed.
// `superRefine` (rather than chained `.min()`s) mirrors the original
// if/else-if branching exactly, so an empty string always reports
// "required" rather than also tripping the "too short" check.
export const createReviewSchema = (t: TFunction, entityType: ApiModel.CommentEntityType) =>
    z.object({
        rating: z.number().superRefine((value, ctx) => {
            if (entityType === 'event' && value === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('components.common.review-form.rating-required', 'Пожалуйста, выберите оценку')
                })
            }
        }),
        content: z
            .string()
            .trim()
            .superRefine((value, ctx) => {
                if (!value) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('components.common.review-form.content-required', 'Пожалуйста, напишите отзыв')
                    })
                } else if (value.length < MIN_CONTENT_LENGTH) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t(
                            'components.common.review-form.content-too-short',
                            'Отзыв должен содержать не менее {{min}} символов',
                            { min: MIN_CONTENT_LENGTH }
                        )
                    })
                } else if (value.length > MAX_CONTENT_LENGTH) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t(
                            'components.common.review-form.content-too-long',
                            'Отзыв не должен превышать {{max}} символов',
                            { max: MAX_CONTENT_LENGTH }
                        )
                    })
                }
            })
    })
