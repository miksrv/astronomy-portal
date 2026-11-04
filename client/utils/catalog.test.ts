import { TFunction } from 'i18next'

import { formatCatalogSize, getObjectTypeLabel, getSimbadUrl } from './catalog'

// Returns the Russian fallback, as the real `t` does without a loaded dictionary
const t = ((_key: string, fallback: string) => fallback) as unknown as TFunction

describe('catalog utils', () => {
    it('names the SIMBAD types and skips an unknown one', () => {
        expect(getObjectTypeLabel('GiG', t)).toBe('Галактика')
        expect(getObjectTypeLabel('AGN', t)).toBe('Галактика')
        expect(getObjectTypeLabel('GlC', t)).toBe('Шаровое скопление')
        expect(getObjectTypeLabel('PN', t)).toBe('Планетарная туманность')
        expect(getObjectTypeLabel('PM*', t)).toBe('Звезда')
        expect(getObjectTypeLabel('Cl*', t)).toBe('Звёздное скопление')
        expect(getObjectTypeLabel('SN*', t)).toBe('Сверхновая')
        expect(getObjectTypeLabel('Rad', t)).toBeUndefined()
        expect(getObjectTypeLabel(null, t)).toBeUndefined()
    })

    it('formats the apparent size', () => {
        expect(formatCatalogSize(70.8, 41, 'en')).toBe('71 × 41′')
        expect(formatCatalogSize(5.2, 5.2, 'en')).toBe('5.2′')
        expect(formatCatalogSize(7, null, 'en')).toBe('7′')
        expect(formatCatalogSize(null, 3, 'en')).toBeUndefined()
    })

    it('links the SIMBAD page', () => {
        expect(getSimbadUrl('M  33')).toBe('https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M%20%2033')
    })
})
