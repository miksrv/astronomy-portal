import { z } from 'zod'

// All four fields are `datetime-local`-compatible values ("YYYY-MM-DDTHH:mm")
// entered and compared as raw Orenburg wall-clock strings — no timezone
// conversion needed here since lexical order matches chronological order for
// that format, and both sides of every comparison are the same "Orenburg
// local" convention the backend's parseOrenburgDateTime() applies. Mirrors
// the checks Events::create()/update() enforce server-side (see
// Events.invalidRegistrationWindow/invalidEventEndDate) so a bad date
// combination is caught immediately instead of round-tripping to a 400 (or,
// if the front-end guard is ever the only line of defense, silently saving
// something the booking-status UI can't render — see the 2026-08-19 incident
// where registrationEnd fell after the event's own date and the
// "registration closed" panel simply never appeared).
export const eventFormSchema = z
    .object({
        title: z.string().optional(),
        content: z.string().optional(),
        date: z.string().optional(),
        endDate: z.string().optional(),
        tickets: z.string().optional(),
        ticketPrice: z.string().optional(),
        minAge: z.string().optional(),
        requiresRegistration: z.boolean().optional(),
        registrationStart: z.string().optional(),
        registrationEnd: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        upload: z.any().optional()
    })
    .superRefine((data, ctx) => {
        if (data.endDate && data.date && data.endDate <= data.date) {
            ctx.addIssue({
                code: 'custom',
                path: ['endDate'],
                message: 'Время окончания мероприятия должно быть позже времени начала'
            })
        }

        if (data.requiresRegistration ?? true) {
            if (data.registrationStart && data.registrationEnd && data.registrationStart >= data.registrationEnd) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['registrationEnd'],
                    message: 'Регистрация должна открываться раньше, чем закрываться'
                })
            } else if (data.registrationEnd && data.date && data.registrationEnd > data.date) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['registrationEnd'],
                    message: 'Регистрация должна закрываться не позднее даты и времени проведения мероприятия'
                })
            }
        }
    })
