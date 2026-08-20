import { z } from 'zod'

import { PHONE_MIN_DIGITS } from './constants'
import { countDigits } from './utils'

export const buildProfileSchema = (t: (key: string, fallback: string) => string) => {
    return z.object({
        name: z.string().trim().min(1, t('pages.profile.name-required', 'Введите имя')),
        phone: z
            .string()
            .trim()
            .refine((value) => value === '' || countDigits(value) >= PHONE_MIN_DIGITS, {
                message: t('pages.profile.phone-invalid', 'Введите корректный номер телефона')
            }),
        birthday: z
            .string()
            .trim()
            .refine((value) => value === '' || value <= new Date().toISOString().slice(0, 10), {
                message: t('pages.profile.birthday-future', 'Дата рождения не может быть в будущем')
            }),
        sex: z.enum(['m', 'f']).optional()
    })
}

export type ProfileFormValues = z.infer<ReturnType<typeof buildProfileSchema>>
