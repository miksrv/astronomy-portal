import { TFunction } from 'i18next'
import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const createMagicLinkSchema = (t: TFunction) =>
    z.object({
        email: z
            .string()
            .trim()
            .min(1, t('components.common.login-form.email-required', 'Введите email'))
            .regex(EMAIL_PATTERN, t('components.common.login-form.email-invalid', 'Введите корректный email'))
    })
