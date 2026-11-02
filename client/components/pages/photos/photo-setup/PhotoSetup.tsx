import React, { useState } from 'react'
import { Button } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { FieldOfView, formatAngle, getFocalRatio, Optics } from '@/utils/optics'

import { MAIN_TYPES, TYPE_ORDER } from './constants'

import styles from './styles.module.sass'

interface PhotoSetupProps {
    photo: ApiModel.Photo
    equipment: ApiModel.Equipment[]
    /** The optical train, from the FITS headers of the object */
    optics?: Optics | null
    /** The sky the picture covers */
    field?: FieldOfView
}

/**
 * How the picture was taken, two lists of label-value rows side by side: the capture - when, how
 * long the light was collected, how many frames, what the optics gives on the sky (the field, the
 * scale, the focal length), how many times it was looked at - and the setup it was shot with. A long setup shows the parts
 * that made the picture and folds the accessories under "more".
 */
export const PhotoSetup: React.FC<PhotoSetupProps> = ({ photo, equipment, optics, field }) => {
    const { t, i18n } = useTranslation()
    const [showAll, setShowAll] = useState(false)

    const typeLabels: Record<ApiModel.EquipmentType, string> = {
        [ApiModel.EquipmentType.Mount]: t('equipment.mount', 'Монтировка'),
        [ApiModel.EquipmentType.Scope]: t('equipment.scope', 'Телескоп'),
        [ApiModel.EquipmentType.Camera]: t('equipment.camera', 'Камера'),
        [ApiModel.EquipmentType.GuidingCamera]: t('equipment.guiding_camera', 'Гид-камера'),
        [ApiModel.EquipmentType.GuidingScope]: t('equipment.guiding_scope', 'Гид-телескоп'),
        [ApiModel.EquipmentType.Focuser]: t('equipment.focuser', 'Фокусер'),
        [ApiModel.EquipmentType.FilterWheel]: t('equipment.filter_wheel', 'Колесо фильтров'),
        [ApiModel.EquipmentType.Filter]: t('equipment.filter', 'Фильтр')
    }

    const typeOf = (item: ApiModel.Equipment) => item.type ?? ApiModel.EquipmentType.Filter
    const sorted = [...equipment].sort((a, b) => TYPE_ORDER.indexOf(typeOf(a)) - TYPE_ORDER.indexOf(typeOf(b)))
    const main = sorted.filter((item) => MAIN_TYPES.includes(typeOf(item)))
    const rest = sorted.filter((item) => !MAIN_TYPES.includes(typeOf(item)))
    // A short setup is shown whole; a long one folds the accessories under "more"
    const foldable = !!main.length && !!rest.length && sorted.length > 4
    const shown = foldable && !showAll ? main : sorted
    const focalRatio = getFocalRatio(optics)
    const exposure = formatExposure(photo.statistic?.exposure, t)

    return (
        <div className={styles.photoSetup}>
            <div className={styles.group}>
                <h3 className={styles.groupTitle}>{t('components.pages.photos.photo-setup.capture', 'Съёмка')}</h3>
                <dl className={styles.rows}>
                    {photo.date && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.date', 'Дата')}</dt>
                            <dd>
                                <time dateTime={photo.date.slice(0, 10)}>
                                    {formatCalendarDate(photo.date, i18n.language)}
                                </time>
                            </dd>
                        </div>
                    )}
                    {exposure && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.exposure', 'Выдержка')}</dt>
                            <dd>{exposure}</dd>
                        </div>
                    )}
                    {!!photo.statistic?.frames && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.frames', 'Кадров')}</dt>
                            <dd>{photo.statistic.frames.toLocaleString(i18n.language)}</dd>
                        </div>
                    )}
                    {field && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.field', 'Поле зрения')}</dt>
                            <dd>{`${formatAngle(field.width, i18n.language)} × ${formatAngle(field.height, i18n.language)}`}</dd>
                        </div>
                    )}
                    {field && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.scale', 'Масштаб')}</dt>
                            <dd>
                                {t('components.pages.photos.photo-setup.scale-value', '{{value}}″ на пиксель', {
                                    value: field.scale.toLocaleString(i18n.language, {
                                        maximumFractionDigits: 2
                                    })
                                })}
                            </dd>
                        </div>
                    )}
                    {!!optics?.focalLength && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.focal-length', 'Фокус')}</dt>
                            <dd>
                                {t('components.pages.photos.photo-setup.millimetres', '{{value}} мм', {
                                    value: optics.focalLength
                                })}
                                {!!focalRatio &&
                                    `, f/${focalRatio.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}`}
                            </dd>
                        </div>
                    )}
                    <div>
                        <dt>{t('components.pages.photos.photo-setup.views', 'Просмотров')}</dt>
                        <dd>{(Number(photo.views) || 0).toLocaleString(i18n.language)}</dd>
                    </div>
                </dl>
            </div>

            {!!sorted.length && (
                <div className={styles.group}>
                    <h3 className={styles.groupTitle}>
                        {t('components.pages.photos.photo-setup.equipment', 'Оборудование')}
                    </h3>
                    <dl className={styles.rows}>
                        {shown.map((item) => (
                            <div
                                key={item.id}
                                title={item.specifications || undefined}
                            >
                                <dt>{typeLabels[typeOf(item)]}</dt>
                                <dd>{[item.brand, item.model].filter(Boolean).join(' ')}</dd>
                            </div>
                        ))}
                    </dl>
                    {foldable && (
                        <Button
                            mode={'link'}
                            className={styles.more}
                            aria-expanded={showAll}
                            label={
                                showAll
                                    ? t('components.pages.photos.photo-setup.less', 'Свернуть')
                                    : t('components.pages.photos.photo-setup.more', 'Ещё {{count}} позиций', {
                                          count: rest.length
                                      })
                            }
                            onClick={() => setShowAll((value) => !value)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
