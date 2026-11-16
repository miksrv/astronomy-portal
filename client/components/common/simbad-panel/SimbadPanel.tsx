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
    /** Shown while there is nothing found yet: what the lookup will do in this form */
    emptyText?: React.ReactNode
    /** The form's word under the facts (what happens to them) */
    note?: React.ReactNode
    onUseCoordinates?: () => void
}

/**
 * What SIMBAD knows of an object, under its name (`GET /objects/simbad/:name`): the main
 * identifier (a link to SIMBAD), the type, the size, the magnitude and the other names. Used by
 * the object editor and the telescope job form. A lookup fills the empty fields at once;
 * coordinates that differ from SIMBAD's are only offered, the person decides.
 */
export const SimbadPanel: React.FC<SimbadPanelProps> = ({
    facts,
    fresh,
    filled,
    ra,
    dec,
    loading,
    error,
    emptyText,
    note,
    onUseCoordinates
}) => {
    const { t, i18n } = useTranslation()

    // A failed lookup is said above what is already known, it doesn't hide it
    const warning =
        error && !loading ? (
            <Message type={'warning'}>
                {getErrorMessage(error) || t('components.common.simbad-panel.error', 'SIMBAD не отвечает')}
            </Message>
        ) : null

    if (!facts) {
        return warning ?? (emptyText ? <p className={styles.simbadNote}>{emptyText}</p> : null)
    }

    const type = getObjectTypeLabel(facts.type, t)
    const size = formatCatalogSize(facts.majAxis, facts.minAxis, i18n.language)
    const magnitude =
        typeof facts.magnitude === 'number' ? `${facts.magnitude.toLocaleString(i18n.language)}ᵐ` : undefined
    const offset =
        typeof ra === 'number' && typeof dec === 'number' ? angularSeparation(ra, dec, facts.ra, facts.dec) : undefined
    const coordinatesDiffer = offset !== undefined && offset > SAME_POSITION_DEGREES

    return (
        <div className={styles.simbadPanel}>
            {warning}
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
                        {t('components.common.simbad-panel.aliases', 'Другие обозначения:')} {facts.aliases.join(', ')}
                    </p>
                )}

                {fresh && !!filled?.length && (
                    <p className={styles.simbadFilled}>
                        {t('components.common.simbad-panel.filled', 'Подставлено: {{fields}}', {
                            fields: filled.join(', ')
                        })}
                    </p>
                )}

                {coordinatesDiffer && (
                    <div className={styles.simbadOffset}>
                        <span>
                            {t(
                                'components.common.simbad-panel.offset',
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
                            label={t('components.common.simbad-panel.use-coordinates', 'Взять координаты SIMBAD')}
                            onClick={onUseCoordinates}
                        />
                    </div>
                )}

                {note && <p className={styles.simbadNote}>{note}</p>}
            </div>
        </div>
    )
}
