import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getCatalogDesignations } from '@/utils/catalog'

import styles from './styles.module.sass'

interface ObjectCatalogFactsProps {
    catalog: ApiModel.CatalogItem
}

/** What OpenNGC knows about the object that the hero does not show: designations, names, surface brightness, morphology */
export const ObjectCatalogFacts: React.FC<ObjectCatalogFactsProps> = ({ catalog }) => {
    const { t, i18n } = useTranslation()

    const names = [...(catalog.nameRu ? [catalog.nameRu] : []), ...catalog.commonNames]

    const facts: Array<{ label: string; value?: string }> = [
        {
            label: t('components.pages.objects.object-catalog-facts.designations', 'Обозначения'),
            value: getCatalogDesignations(catalog).join(', ')
        },
        {
            label: t('components.pages.objects.object-catalog-facts.names', 'Другие названия'),
            value: names.join(', ')
        },
        {
            label: t('components.pages.objects.object-catalog-facts.surface-brightness', 'Поверхностная яркость'),
            value:
                typeof catalog.surfBrightness === 'number'
                    ? `${catalog.surfBrightness.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} ${t('components.pages.objects.object-catalog-facts.surface-brightness-unit', 'зв. вел. / кв. угл. сек.')}`
                    : undefined
        },
        {
            label: t('components.pages.objects.object-catalog-facts.hubble', 'Морфологический тип'),
            value: catalog.hubble ?? undefined
        }
    ]

    const visible = facts.filter(({ value }) => !!value)

    return (
        <div className={styles.catalogFacts}>
            <h3 className={styles.title}>
                {t('components.pages.objects.object-catalog-facts.title', 'Данные каталога')}
            </h3>

            {!!visible.length && (
                <dl className={styles.facts}>
                    {visible.map(({ label, value }) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <p className={styles.attribution}>
                {t('components.pages.objects.object-catalog-facts.attribution', 'Данные каталога:')}{' '}
                <a
                    href={'https://github.com/mattiaverga/OpenNGC'}
                    target={'_blank'}
                    rel={'noopener noreferrer'}
                >
                    {'OpenNGC'}
                </a>
                {' (CC BY-SA 4.0)'}
            </p>
        </div>
    )
}
