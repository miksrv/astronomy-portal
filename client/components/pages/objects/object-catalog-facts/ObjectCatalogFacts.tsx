import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { getSimbadUrl } from '@/utils/catalog'

import styles from './styles.module.sass'

interface ObjectCatalogFactsProps {
    /** The other names of the object, from SIMBAD: "NGC 598", "Triangulum Galaxy" */
    aliases: string[]
    /** The SIMBAD main identifier, for the link to its page */
    simbadId?: string | null
}

/** The names the object is also known by, from SIMBAD */
export const ObjectCatalogFacts: React.FC<ObjectCatalogFactsProps> = ({ aliases, simbadId }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.catalogFacts}>
            <h3 className={styles.title}>
                {t('components.pages.objects.object-catalog-facts.title', 'Другие обозначения')}
            </h3>

            <p className={styles.aliases}>{aliases.join(', ')}</p>

            <p className={styles.attribution}>
                {t('components.pages.objects.object-catalog-facts.attribution', 'Данные:')}{' '}
                {simbadId ? (
                    <a
                        href={getSimbadUrl(simbadId)}
                        target={'_blank'}
                        rel={'noopener noreferrer'}
                    >
                        {'SIMBAD'}
                    </a>
                ) : (
                    'SIMBAD'
                )}
                {' (CDS, Strasbourg)'}
            </p>
        </div>
    )
}
