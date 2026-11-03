import React from 'react'

import { ApiModel } from '@/api'
import { fitAffineBetween } from '@/utils/wcs'

export interface AlignedLayer {
    /** The other picture's box over this one, transformed so that the stars meet */
    style: React.CSSProperties
    /** How much wider than this picture the other one is drawn, for the image's `sizes` */
    zoom: number
}

/**
 * Where to draw the other version over this one so that the stars meet, from the two plate
 * solves; `undefined` when either isn't solved or they look at different skies.
 *
 * The box is sized in percent of the frame (the frame has this picture's proportions), so one
 * pixel of the other solve is one pixel of this solve before the transform: the fitted matrix
 * then applies as is, and only its shift needs to be in the box's own percent
 */
export const getAlignedLayer = (
    current?: ApiModel.PhotoAstrometry,
    other?: ApiModel.PhotoAstrometry
): AlignedLayer | undefined => {
    const to = current?.wcs
    const from = other?.wcs

    if (!to || !from) {
        return undefined
    }

    const matrix = fitAffineBetween(from, to)

    if (!matrix) {
        return undefined
    }

    const { a, b, c, d, e, f } = matrix

    return {
        style: {
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${(from.width / to.width) * 100}%`,
            height: `${(from.height / to.height) * 100}%`,
            transformOrigin: '0 0',
            transform: `translate(${(e / from.width) * 100}%, ${(f / from.height) * 100}%) matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`
        },
        zoom: (from.width / to.width) * Math.sqrt(Math.abs(a * d - b * c))
    }
}
