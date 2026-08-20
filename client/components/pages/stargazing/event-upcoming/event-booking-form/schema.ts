import { TFunction } from 'i18next'
import { z } from 'zod'

// After stripping everything but digits, a real phone number falls in this
// range — matches what PhoneInput's own sanitizer lets the field contain.
const PHONE_DIGITS_PATTERN = /^\d{10,15}$/

export const createBookingSchema = (t: TFunction) =>
    z
        .object({
            name: z
                .string()
                .trim()
                .min(1, t('components.pages.stargazing.event-upcoming.booking-form-name-required', 'Введите ваше имя')),
            phone: z
                .string()
                .trim()
                .min(
                    1,
                    t(
                        'components.pages.stargazing.event-upcoming.booking-form-phone-required',
                        'Введите номер телефона'
                    )
                )
                .refine(
                    (value) => PHONE_DIGITS_PATTERN.test(value.replace(/\D/g, '')),
                    t(
                        'components.pages.stargazing.event-upcoming.booking-form-phone-invalid',
                        'Введите корректный номер телефона'
                    )
                ),
            adults: z.string(),
            children: z.string(),
            childrenAges: z.array(z.object({ age: z.number().optional() }))
        })
        .superRefine((values, ctx) => {
            const childrenCount = Number(values.children || 0)

            if (childrenCount === 0) {
                return
            }

            // Normally kept in sync by the effect below that grows/shrinks
            // `childrenAges` to match the selected count — a length mismatch
            // here means that sync hasn't happened yet (e.g. submit fired in
            // the same tick as changing the children count). Flag the whole
            // array rather than guessing which per-child selects to blame.
            if (values.childrenAges.length !== childrenCount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t(
                        'components.pages.stargazing.event-upcoming.booking-form-children-ages-required',
                        'Укажите возраст каждого ребенка'
                    ),
                    path: ['childrenAges']
                })
                return
            }

            // Otherwise flag each child's own select individually, so it
            // highlights in place instead of a single message for the group.
            values.childrenAges.forEach((item, index) => {
                if (typeof item.age !== 'number') {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t(
                            'components.pages.stargazing.event-upcoming.booking-form-child-age-required',
                            'Укажите возраст'
                        ),
                        path: ['childrenAges', index, 'age']
                    })
                }
            })
        })
