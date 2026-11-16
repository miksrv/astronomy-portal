import { z } from 'zod'

import { ApiType } from '@/api'
import { parseDec, parseRA } from '@/utils/coordinates'

import { DEC_MAX, DEC_MIN, NAME_MAX, NAME_MIN, RA_MAX, RA_MIN } from './constants'

export const buildObjectSchema = (t: (key: string, fallback: string) => string) =>
    z.object({
        categories: z
            .array(z.number())
            .min(
                1,
                t('components.pages.objects.astro-object-form.categories-required', 'Выберите хотя бы одну категорию')
            ),
        name: z
            .string()
            .trim()
            .min(1, t('components.pages.objects.astro-object-form.name-required', 'Введите имя объекта в каталогах'))
            .min(NAME_MIN, t('components.pages.objects.astro-object-form.name-length', 'Имя — от 3 до 40 символов'))
            .max(NAME_MAX, t('components.pages.objects.astro-object-form.name-length', 'Имя — от 3 до 40 символов'))
            // The name is the object's key and the name of its FITS frames: no spaces in it
            .regex(
                /^\S+$/,
                t(
                    'components.pages.objects.astro-object-form.name-spaces',
                    'Вместо пробелов используйте подчёркивание: M_51'
                )
            ),
        title: z
            .string()
            .trim()
            .min(1, t('components.pages.objects.astro-object-form.title-required', 'Введите название объекта')),
        fitsCloudLink: z.union([
            z.literal(''),
            z
                .string()
                .trim()
                .pipe(
                    z.url({
                        protocol: /^https?$/,
                        error: t(
                            'components.pages.objects.astro-object-form.fits-link-invalid',
                            'Введите ссылку целиком, с https://'
                        )
                    })
                )
        ]),
        // Typed as text: degrees or the hours/degrees of an atlas (see utils.ts)
        ra: z
            .string()
            .trim()
            .min(1, t('components.pages.objects.astro-object-form.ra-required', 'Введите значение RA'))
            .superRefine((value, context) => {
                const ra = parseRA(value)

                if (ra === undefined) {
                    context.addIssue({
                        code: 'custom',
                        message: t(
                            'components.pages.objects.astro-object-form.ra-format',
                            'Не получилось прочитать: введите градусы (202.47) или часы (13:29:53)'
                        )
                    })
                } else if (ra < RA_MIN || ra >= RA_MAX) {
                    context.addIssue({
                        code: 'custom',
                        message: t(
                            'components.pages.objects.astro-object-form.ra-range',
                            'RA должно быть в диапазоне от 0 до 360'
                        )
                    })
                }
            }),
        dec: z
            .string()
            .trim()
            .min(1, t('components.pages.objects.astro-object-form.dec-required', 'Введите значение DEC'))
            .superRefine((value, context) => {
                const dec = parseDec(value)

                if (dec === undefined) {
                    context.addIssue({
                        code: 'custom',
                        message: t(
                            'components.pages.objects.astro-object-form.dec-format',
                            'Не получилось прочитать: введите градусы (47.195) или +47:11:43'
                        )
                    })
                } else if (dec < DEC_MIN || dec > DEC_MAX) {
                    context.addIssue({
                        code: 'custom',
                        message: t(
                            'components.pages.objects.astro-object-form.dec-range',
                            'DEC должно быть в диапазоне от -90 до 90'
                        )
                    })
                }
            }),
        // Optional catalog facts: an empty field is NaN, sent to the API as null
        distance: z.union([
            z.nan(),
            z
                .number()
                .positive(
                    t(
                        'components.pages.objects.astro-object-form.distance-positive',
                        'Расстояние должно быть больше нуля'
                    )
                )
        ]),
        magnitude: z.union([
            z.nan(),
            z
                .number()
                .min(
                    -30,
                    t('components.pages.objects.astro-object-form.magnitude-range', 'Звёздная величина — от −30 до 30')
                )
                .max(
                    30,
                    t('components.pages.objects.astro-object-form.magnitude-range', 'Звёздная величина — от −30 до 30')
                )
        ]),
        description: z.string().trim(),
        // Set by "Найти в SIMBAD", never typed: taken as it is
        simbad: z.custom<ApiType.Objects.SimbadFacts | null>()
    })
