import { z } from 'zod'

import { DEC_MAX, DEC_MIN, RA_MAX, RA_MIN } from './constants'

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
            .min(1, t('components.pages.objects.astro-object-form.name-required', 'Введите имя объекта в каталогах')),
        title: z
            .string()
            .trim()
            .min(1, t('components.pages.objects.astro-object-form.title-required', 'Введите название объекта')),
        fitsCloudLink: z.string().trim(),
        ra: z
            .number({
                error: t('components.pages.objects.astro-object-form.ra-required', 'Введите значение RA')
            })
            .min(
                RA_MIN,
                t('components.pages.objects.astro-object-form.ra-range', 'RA должно быть в диапазоне от 0 до 360')
            )
            .max(
                RA_MAX,
                t('components.pages.objects.astro-object-form.ra-range', 'RA должно быть в диапазоне от 0 до 360')
            ),
        dec: z
            .number({
                error: t('components.pages.objects.astro-object-form.dec-required', 'Введите значение DEC')
            })
            .min(
                DEC_MIN,
                t('components.pages.objects.astro-object-form.dec-range', 'DEC должно быть в диапазоне от -90 до 90')
            )
            .max(
                DEC_MAX,
                t('components.pages.objects.astro-object-form.dec-range', 'DEC должно быть в диапазоне от -90 до 90')
            ),
        description: z.string().trim()
    })
