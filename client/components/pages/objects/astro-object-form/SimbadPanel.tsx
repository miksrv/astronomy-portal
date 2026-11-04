import React from 'react'
import { Button, cn, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiType } from '@/api'
import { angularSeparation } from '@/components/common/star-map/telescope'
import { formatCatalogSize, getObjectTypeLabel, getSimbadUrl } from '@/utils/catalog'
import { formatDECShort, formatRAShort } from '@/utils/coordinates'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

/**
 * Coordinates closer than this (degrees) are not worth offering SIMBAD's: a frame centre is often
 * a few arcminutes off a nebula's catalog centre on purpose
 */
const SAME_POSITION_DEGREES = 0.1

interface SimbadPanelProps {
    /** What is shown: looked up just now, or stored with the edited object */
    facts?: ApiType.Objects.SimbadFacts | null
    /** The facts come from the lookup in this form (not yet saved) */
    fresh?: boolean
    /** The fields the lookup filled in, to say so */
    filled?: string[]
    /** The coordinates in the form now, to compare with SIMBAD's */
    ra?: number
    dec?: number
    loading?: boolean
    error?: unknown
    isEdit?: boolean
    onUseCoordinates?: () => void
}

/**
 * What SIMBAD knows of the object, under its name: the main identifier (a link to SIMBAD), the
 * type, the size, the magnitude and the other names. A lookup fills the empty fields at once;
 * coordinates that differ from SIMBAD's are only offered, the editor decides.
 */
export const SimbadPanel: React.FC<SimbadPanelProps> = ({
    facts,
    fresh,
    filled,
    ra,
    dec,
    loading,
    error,
    isEdit,
    onUseCoordinates
}) => {
    const { t, i18n } = useTranslation()

    if (error && !loading) {
        return (
            <Message type={'warning'}>
                {getErrorMessage(error) ||
                    t('components.pages.objects.astro-object-form.simbad-error', 'SIMBAD не отвечает')}
            </Message>
        )
    }

    if (!facts) {
        return (
            <p className={styles.simbadNote}>
                {isEdit
                    ? t(
                          'components.pages.objects.astro-object-form.simbad-none',
                          'Объект ещё не сверялся с SIMBAD. Нажмите «Найти в SIMBAD» — подставим тип, угловой размер и другие обозначения.'
                      )
                    : t(
                          'components.pages.objects.astro-object-form.simbad-create',
                          'Нажмите «Найти в SIMBAD» — подставим координаты, тип, угловой размер и звёздную величину. Если не нажимать, данные подтянутся из SIMBAD при сохранении.'
                      )}
            </p>
        )
    }

    const type = getObjectTypeLabel(facts.type, t)
    const size = formatCatalogSize(facts.majAxis, facts.minAxis, i18n.language)
    const magnitude =
        typeof facts.magnitude === 'number' ? `${facts.magnitude.toLocaleString(i18n.language)}ᵐ` : undefined
    const offset =
        typeof ra === 'number' && typeof dec === 'number' ? angularSeparation(ra, dec, facts.ra, facts.dec) : undefined
    const coordinatesDiffer = offset !== undefined && offset > SAME_POSITION_DEGREES

    return (
        <div className={cn(styles.simbadCard, loading && styles.simbadLoading)}>
            <p className={styles.simbadTitle}>
                <a
                    href={getSimbadUrl(facts.simbadId)}
                    target={'_blank'}
                    rel={'noopener noreferrer'}
                >
                    {facts.simbadId}
                </a>
                {[type, size, magnitude].filter(Boolean).map((fact) => (
                    <span key={fact}>{fact}</span>
                ))}
            </p>

            {!!facts.aliases.length && (
                <p className={styles.simbadAliases}>
                    {t('components.pages.objects.astro-object-form.simbad-aliases', 'Другие обозначения:')}{' '}
                    {facts.aliases.join(', ')}
                </p>
            )}

            {fresh && !!filled?.length && (
                <p className={styles.simbadFilled}>
                    {t('components.pages.objects.astro-object-form.simbad-filled', 'Подставлено: {{fields}}', {
                        fields: filled.join(', ')
                    })}
                </p>
            )}

            {coordinatesDiffer && (
                <div className={styles.simbadOffset}>
                    <span>
                        {t(
                            'components.pages.objects.astro-object-form.simbad-offset',
                            'В SIMBAD координаты {{ra}} {{dec}} — в {{offset}}° от введённых',
                            {
                                ra: formatRAShort(facts.ra),
                                dec: formatDECShort(facts.dec),
                                offset: Number(offset.toFixed(offset < 1 ? 2 : 1)).toLocaleString(i18n.language)
                            }
                        )}
                    </span>
                    <Button
                        type={'button'}
                        size={'small'}
                        mode={'secondary'}
                        label={t(
                            'components.pages.objects.astro-object-form.simbad-use-coordinates',
                            'Взять координаты SIMBAD'
                        )}
                        onClick={onUseCoordinates}
                    />
                </div>
            )}

            <p className={styles.simbadNote}>
                {fresh
                    ? t(
                          'components.pages.objects.astro-object-form.simbad-fresh',
                          'Тип, размер и обозначения сохранятся вместе с формой.'
                      )
                    : t(
                          'components.pages.objects.astro-object-form.simbad-stored',
                          'Данные SIMBAD, сохранённые у объекта.'
                      )}
            </p>
        </div>
    )
}
