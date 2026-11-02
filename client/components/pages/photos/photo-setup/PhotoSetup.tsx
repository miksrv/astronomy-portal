import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getSolvedField } from '@/utils/astrometry'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { FieldOfView, formatAngle, getFocalRatio, Optics } from '@/utils/optics'

import { TYPE_ORDER } from './constants'

import styles from './styles.module.sass'

interface PhotoSetupProps {
    photo: ApiModel.Photo
    equipment: ApiModel.Equipment[]
    /** The optical train, from the FITS headers of the object */
    optics?: Optics | null
    /** The sky the picture covers, worked out from the optics */
    field?: FieldOfView
    /** The plate solve: the measured sky, preferred over the optics' estimate */
    astrometry?: ApiModel.SolvedAstrometry
}

/**
 * How the picture was taken, two lists of label-value rows side by side: the capture - when, how
 * long the light was collected, how many frames, what the optics gives on the sky (the field, the
 * scale, the focal length), how many times it was looked at - and the setup it was shot with. A long setup shows the parts
 * that made the picture and folds the accessories under "more".
 */
export const PhotoSetup: React.FC<PhotoSetupProps> = ({ photo, equipment, optics, field, astrometry }) => {
    const { t, i18n } = useTranslation()

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
    const focalRatio = getFocalRatio(optics)
    const exposure = formatExposure(photo.statistic?.exposure, t)

    // The plate solve, when there is one, knows the sky better than the optics do
    const solved = astrometry
        ? {
              ra: astrometry.ra,
              dec: astrometry.dec,
              ...getSolvedField(astrometry, photo.imageWidth),
              // East of north, 0…360: the service may answer a negative angle
              rotation: (((Math.round(astrometry.orientation) % 360) + 360) % 360) as number
          }
        : undefined
    const sky = solved ?? field

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
                    {solved && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.center', 'Центр поля')}</dt>
                            <dd>
                                {formatRAShort(solved.ra)} {formatDECShort(solved.dec)}
                            </dd>
                        </div>
                    )}
                    {sky && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.field', 'Поле зрения')}</dt>
                            <dd>{`${formatAngle(sky.width, i18n.language)} × ${formatAngle(sky.height, i18n.language)}`}</dd>
                        </div>
                    )}
                    {sky && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.scale', 'Масштаб')}</dt>
                            <dd>
                                {t('components.pages.photos.photo-setup.scale-value', '{{value}}″ на пиксель', {
                                    value: sky.scale.toLocaleString(i18n.language, {
                                        maximumFractionDigits: 2
                                    })
                                })}
                            </dd>
                        </div>
                    )}
                    {solved && (
                        <div>
                            <dt>{t('components.pages.photos.photo-setup.rotation', 'Поворот')}</dt>
                            <dd>
                                {t('components.pages.photos.photo-setup.rotation-value', '{{value}}° от севера', {
                                    value: solved.rotation
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
                        {sorted.map((item) => (
                            <div
                                key={item.id}
                                title={item.specifications || undefined}
                            >
                                <dt>{typeLabels[typeOf(item)]}</dt>
                                <dd>{[item.brand, item.model].filter(Boolean).join(' ')}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
        </div>
    )
}
