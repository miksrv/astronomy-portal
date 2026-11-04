import { TFunction } from 'i18next'

import {
    formatCatalogSize,
    formatCatalogTitle,
    formatDesignation,
    getCatalogDesignations,
    getCatalogTypeLabel
} from './catalog'

// Returns the Russian fallback, as the real `t` does without a loaded dictionary
const t = ((_key: string, fallback: string) => fallback) as unknown as TFunction

describe('catalog utils', () => {
    it('spaces the catalog prefix from the number', () => {
        expect(formatDesignation('NGC598')).toBe('NGC 598')
        expect(formatDesignation('IC1396')).toBe('IC 1396')
        expect(formatDesignation('NGC224A')).toBe('NGC 224A')
        expect(formatDesignation('Mel022')).toBe('Mel 022')
        expect(formatDesignation(null)).toBe('')
    })

    it('puts the Messier number first', () => {
        expect(getCatalogDesignations({ messier: 31, designation: 'NGC224' })).toStrictEqual(['M 31', 'NGC 224'])
        expect(formatCatalogTitle({ messier: 31, designation: 'NGC224' })).toBe('M 31 · NGC 224')
        expect(formatCatalogTitle({ messier: null, designation: 'IC1396' })).toBe('IC 1396')
    })

    it('names the type codes and keeps an unknown one', () => {
        expect(getCatalogTypeLabel('G', t)).toBe('Галактика')
        expect(getCatalogTypeLabel('*Ass', t)).toBe('Звёздная ассоциация')
        expect(getCatalogTypeLabel('XYZ', t)).toBe('XYZ')
        expect(getCatalogTypeLabel(undefined, t)).toBe('')
    })

    it('formats the apparent size', () => {
        expect(formatCatalogSize(70.8, 41, 'en')).toBe('71 × 41′')
        expect(formatCatalogSize(5.2, 5.2, 'en')).toBe('5.2′')
        expect(formatCatalogSize(7, null, 'en')).toBe('7′')
        expect(formatCatalogSize(null, 3, 'en')).toBeUndefined()
    })
})
