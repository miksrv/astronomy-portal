import { buildSkyGrid, formatGridValue, pixelToSky, skyToPixel, Wcs } from './wcs'

/**
 * A TAN + SIP solution with a tilted CD matrix near RA 0h. The expected sky positions come from
 * astropy 6.0 `all_pix2world` on the same header (origin=1, our x + 1), so the 1-based CRPIX,
 * the direction of the A/B polynomials and the pole convention are checked against a reference
 */
const wcs: Wcs = {
    crval: [1.2, 61.5],
    crpix: [2000.5, 1500.5],
    cd: [
        [-1e-3, 2e-5],
        [3e-5, 1e-3]
    ],
    width: 4000,
    height: 3000,
    sip: {
        a: [
            [2, 0, 1e-7],
            [1, 1, -2e-7],
            [0, 2, 3e-8]
        ],
        b: [
            [2, 0, -5e-8],
            [1, 1, 1e-7],
            [0, 2, 2e-7]
        ]
    }
}

describe('wcs', () => {
    it('puts a pixel on the sky like astropy does', () => {
        const cases: Array<[x: number, y: number, ra: number, dec: number]> = [
            [0, 0, 5.12474325218945, 59.88309053079419],
            [4000, 3000, 356.86082580946794, 62.99419359902722],
            [1000, 500, 3.18641126027321, 60.45610130051586],
            [2000, 1500, 1.198973071058, 61.500514991]
        ]

        for (const [x, y, ra, dec] of cases) {
            const sky = pixelToSky(wcs, { x, y })

            expect(sky.ra).toBeCloseTo(ra, 6)
            expect(sky.dec).toBeCloseTo(dec, 6)
        }
    })

    it('round-trips sky to pixel without inverse polynomials, by iteration', () => {
        for (const point of [
            { x: 10, y: 20 },
            { x: 1234, y: 2345 },
            { x: 3990, y: 10 }
        ]) {
            const back = skyToPixel(wcs, pixelToSky(wcs, point))

            expect(back).toBeDefined()
            expect(back!.x).toBeCloseTo(point.x, 2)
            expect(back!.y).toBeCloseTo(point.y, 2)
        }
    })

    it('round-trips exactly without distortion', () => {
        const plain: Wcs = { ...wcs, sip: undefined }
        const back = skyToPixel(plain, pixelToSky(plain, { x: 123.4, y: 567.8 }))

        expect(back!.x).toBeCloseTo(123.4, 6)
        expect(back!.y).toBeCloseTo(567.8, 6)
    })

    it('draws a continuous grid across the RA 0h seam', () => {
        const grid = buildSkyGrid(wcs)
        const raLines = grid.lines.filter(({ kind }) => kind === 'ra')
        const decLines = grid.lines.filter(({ kind }) => kind === 'dec')

        expect(raLines.length).toBeGreaterThan(1)
        expect(decLines.length).toBeGreaterThan(1)
        // Lines on both sides of the seam, every value normalised to 0…360
        expect(raLines.some(({ value }) => value > 350)).toBe(true)
        expect(raLines.some(({ value }) => value < 10)).toBe(true)
        expect(raLines.every(({ value }) => value >= 0 && value < 360)).toBe(true)
        // No line is listed twice
        expect(new Set(grid.lines.map(({ kind, value }) => `${kind}-${value}`)).size).toBe(grid.lines.length)
        // The compass points somewhere
        expect(Math.hypot(grid.north.x, grid.north.y)).toBeCloseTo(1, 6)
        expect(Math.hypot(grid.east.x, grid.east.y)).toBeCloseTo(1, 6)
    })

    it('labels grid lines', () => {
        expect(formatGridValue({ kind: 'dec', value: 61.5 }, 0.5)).toBe('+61° 30′')
        expect(formatGridValue({ kind: 'dec', value: -5 }, 1)).toBe('−5°')
        expect(formatGridValue({ kind: 'dec', value: -1e-12 }, 0.5)).toBe('+0° 00′')
        expect(formatGridValue({ kind: 'ra', value: 38 }, 0.5)).toMatch(/^2ʰ 32ᵐ/)
        expect(formatGridValue({ kind: 'ra', value: 359.5 }, 0.5)).toMatch(/^23ʰ 58ᵐ/)
    })
})
