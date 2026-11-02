import { formatAngle, getFieldOfView, getFocalRatio, getImageField, pickScaleBar } from './optics'

describe('optics', () => {
    // Sky-Watcher BK2001P at 1000 mm, ASI 1600 MM Pro (3.8 µm, 4656×3520)
    const bk2001 = { focalLength: 1000, aperture: 200, pixelSize: 3.8, width: 4656, height: 3520, scale: 0.78394 }

    it('computes the focal ratio', () => {
        expect(getFocalRatio(bk2001)).toBe(5)
        expect(getFocalRatio({ focalLength: 1000 })).toBeUndefined()
    })

    it('takes the plate scale from the header and derives the field', () => {
        const fov = getFieldOfView(bk2001)

        expect(fov?.scale).toBeCloseTo(0.784, 3)
        expect(fov?.width).toBeCloseTo(1.014, 2)
        expect(fov?.height).toBeCloseTo(0.766, 2)
    })

    it('derives the scale from pixel size and focal length when the header has none', () => {
        expect(getFieldOfView({ ...bk2001, scale: null })?.scale).toBeCloseTo(0.784, 3)
        expect(getFieldOfView({ width: 100, height: 100 })).toBeUndefined()
        expect(getFieldOfView(null)).toBeUndefined()
    })

    it('formats angles in degrees or arcminutes', () => {
        expect(formatAngle(1.014, 'en')).toBe('1.01°')
        expect(formatAngle(0.766, 'en')).toBe('46′')
    })

    it('measures the sky of a picture cropped from the sensor', () => {
        expect(getImageField(4656, 3520, bk2001)?.width).toBeCloseTo(1.014, 2)
        // A crop, also rotated by 90°
        expect(getImageField(3000, 4000, bk2001)?.height).toBeCloseTo(0.871, 2)
        // Drizzled or resized: the sensor's scale says nothing about it
        expect(getImageField(9312, 7040, bk2001)).toBeUndefined()
        expect(getImageField(1200, 900, bk2001)).toBeUndefined()
        expect(getImageField(4656, 3520, null)).toBeUndefined()
    })

    it('picks the longest round scale bar that fits', () => {
        // 1° over 1000 px: 15′ is 250 px, 30′ would be 500
        expect(pickScaleBar(1 / 1000, 300)).toStrictEqual({ px: 250, degrees: 0.25 })
        expect(pickScaleBar(1 / 1000, 10)).toBeUndefined()
        expect(pickScaleBar(0, 100)).toBeUndefined()
    })
})
