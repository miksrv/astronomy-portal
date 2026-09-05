import { matchSearchItems, SearchItem } from './searchIndex'

const ITEMS: SearchItem[] = [
    { kind: 'star', id: '91262', name: 'Вега', keywords: ['vega', 'вега', 'α lyr'], ra: 279.23, dec: 38.78 },
    { kind: 'star', id: '69673', name: 'Арктур', keywords: ['arcturus', 'арктур'], ra: 213.9, dec: 19.18 },
    {
        kind: 'dso',
        id: 'NGC 224',
        name: 'Галактика Андромеды (NGC 224)',
        keywords: ['andromeda galaxy', 'галактика андромеды', 'ngc 224'],
        ra: 10.68,
        dec: 41.27
    },
    {
        kind: 'constellation',
        id: 'And',
        name: 'Андромеда',
        keywords: ['andromeda', 'андромеда', 'and'],
        ra: 0.75,
        dec: 43
    },
    { kind: 'moon', id: 'Moon', name: 'Луна', keywords: ['луна', 'moon'] },
    { kind: 'portal', id: 'M31', name: 'M 31', keywords: ['m 31', 'm31'], ra: 10.68, dec: 41.27 }
]

describe('star-map search', () => {
    it('matches case-insensitively in both languages', () => {
        expect(matchSearchItems(ITEMS, 'ВЕГА').map((i) => i.id)).toContain('91262')
        expect(matchSearchItems(ITEMS, 'vega').map((i) => i.id)).toContain('91262')
    })

    it('matches by catalog designation substring', () => {
        expect(matchSearchItems(ITEMS, 'ngc 22').map((i) => i.id)).toContain('NGC 224')
    })

    it('ranks prefix matches before mid-string matches', () => {
        const results = matchSearchItems(ITEMS, 'андром')

        expect(results[0]?.kind).toBe('constellation')
        expect(results.map((i) => i.id)).toContain('NGC 224')
    })

    it('requires at least two characters', () => {
        expect(matchSearchItems(ITEMS, 'v')).toStrictEqual([])
        expect(matchSearchItems(ITEMS, '  ')).toStrictEqual([])
    })

    it('respects the result limit', () => {
        expect(matchSearchItems(ITEMS, 'а', 3)).toHaveLength(0)
        expect(matchSearchItems(ITEMS, 'ан', 2)).toHaveLength(2)
    })

    it('finds solar-system bodies without coordinates', () => {
        const results = matchSearchItems(ITEMS, 'луна')

        expect(results[0]?.kind).toBe('moon')
        expect(results[0]?.ra).toBeUndefined()
    })
})
