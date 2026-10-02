import { buildSearchIndex, matchSearchItems, SearchItem } from './searchIndex'

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
    describe('buildSearchIndex', () => {
        const dsoNames = { 'NGC 224': { name: 'Andromeda Galaxy', ru: 'Галактика Андромеды' } }
        const dsoPositions = [
            { id: 'NGC 224', ra: 10.68, dec: 41.27, mag: 3.4, desig: 'M 31' },
            { id: 'NGC 6121', ra: 245.9, dec: -26.53, mag: 5.9, desig: 'M 4' },
            { id: 'Cr 399', ra: 297.5, dec: 20.1, mag: 3.6 }
        ]
        const input = {
            language: 'ru',
            starNames: {},
            dsoNames,
            constellations: [],
            starPositions: [],
            dsoPositions,
            bodyLabels: {}
        }

        it('names DSOs by proper name, then designation, then id', () => {
            const items = buildSearchIndex(input)

            expect(items.map((item) => [item.name, item.secondary])).toStrictEqual([
                ['Галактика Андромеды', 'M 31 · NGC 224'],
                ['M 4', 'NGC 6121'],
                ['Cr 399', undefined]
            ])
        })

        it('finds Messier objects with or without the space in the designation', () => {
            const items = buildSearchIndex(input)

            expect(matchSearchItems(items, 'M 31').map((item) => item.id)).toStrictEqual(['NGC 224'])
            expect(matchSearchItems(items, 'm31').map((item) => item.id)).toStrictEqual(['NGC 224'])
            expect(matchSearchItems(items, 'ngc224').map((item) => item.id)).toStrictEqual(['NGC 224'])
        })
    })

    it('matches case-insensitively in both languages', () => {
        expect(matchSearchItems(ITEMS, 'ВЕГА').map((i) => i.id)).toContain('91262')
        expect(matchSearchItems(ITEMS, 'vega').map((i) => i.id)).toContain('91262')
    })

    it('treats ё and е as the same letter, in the query and in the names', () => {
        const items = buildSearchIndex({
            language: 'ru',
            starNames: {},
            dsoNames: {},
            constellations: [
                { id: 'Tau', name: 'Taurus', ru: 'Телец', coordinates: [66, 16] },
                { id: 'Aql', name: 'Aquila', ru: 'Орёл', coordinates: [297, 3] }
            ],
            starPositions: [],
            dsoPositions: [],
            bodyLabels: {}
        })

        // Name spelled with ё, query typed with е
        expect(matchSearchItems(items, 'орел').map((item) => item.id)).toStrictEqual(['Aql'])
        // ...and the other way round
        expect(matchSearchItems(items, 'Орёл').map((item) => item.id)).toStrictEqual(['Aql'])
        expect(matchSearchItems(items, 'телёц').map((item) => item.id)).toStrictEqual(['Tau'])
        // The display name keeps its original spelling
        expect(matchSearchItems(items, 'орел')[0]?.name).toBe('Орёл')
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
