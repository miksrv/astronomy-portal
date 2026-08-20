import { TFunction } from 'i18next'
import { z } from 'zod'

import { ApiModel } from '@/api'

import { FILTER_KEYS } from './constants'

export const createPhotoSchema = (t: TFunction) => {
    const framesMessage = t(
        'components.pages.photos.astro-photo-form.frames-required',
        'Введите количество кадров (целое число больше нуля)'
    )
    const exposureMessage = t(
        'components.pages.photos.astro-photo-form.exposure-required',
        'Введите выдержку в минутах (число больше нуля)'
    )

    const filterItemSchema = z.object({
        filter: z.enum(FILTER_KEYS as [ApiModel.FilterTypes, ...ApiModel.FilterTypes[]]),
        frames: z.number({ error: framesMessage }).int(framesMessage).positive(framesMessage),
        exposure: z.number({ error: exposureMessage }).positive(exposureMessage)
    })

    return z.object({
        categories: z
            .array(z.number())
            .min(
                1,
                t('components.pages.photos.astro-photo-form.categories-required', 'Выберите хотя бы одну категорию')
            ),
        objects: z
            .array(z.string())
            .min(1, t('components.pages.photos.astro-photo-form.objects-required', 'Выберите хотя бы один объект')),
        equipments: z
            .array(z.number())
            .min(
                1,
                t('components.pages.photos.astro-photo-form.equipments-required', 'Выберите хотя бы одно оборудование')
            ),
        date: z.string().min(1, t('components.pages.photos.astro-photo-form.date-required', 'Укажите дату обработки')),
        filters: z
            .array(filterItemSchema)
            .min(1, t('components.pages.photos.astro-photo-form.filters-required', 'Добавьте хотя бы один фильтр')),
        upload: z.instanceof(File).optional()
    })
}
