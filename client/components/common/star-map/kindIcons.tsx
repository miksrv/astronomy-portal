import React from 'react'
import { Icon } from 'simple-react-ui-kit'

import { ConstellationLinesIcon, DeepSkyIcon, PlanetIcon, RadiantIcon, StarIcon } from '@/components/icons'

import { SearchItemKind } from './searchIndex'

interface KindIconProps {
    kind: SearchItemKind
    /** Pixel size of the glyph (kit icons scale via font-size, outline icons via width/height) */
    size?: number
    className?: string
}

/**
 * Object-kind glyph shared by the search results and the info popup header — replaces
 * the old text glyphs (✦ ✧ ☄ …), which were cryptic and mislabelled constellations
 * with a comet. Decorative: the kind is also spelled out next to it.
 */
export const KindIcon: React.FC<KindIconProps> = ({ kind, size = 16, className }) => {
    const outline = { width: size, height: size }

    const glyph = (() => {
        switch (kind) {
            case 'star':
                return <StarIcon {...outline} />
            case 'dso':
                return <DeepSkyIcon {...outline} />
            case 'constellation':
                return <ConstellationLinesIcon {...outline} />
            case 'planet':
                return <PlanetIcon {...outline} />
            case 'radiant':
                return <RadiantIcon {...outline} />
            case 'sun':
                return <Icon name={'Sun'} />
            case 'moon':
                return <Icon name={'Moon'} />
            case 'portal':
                return <Icon name={'Photo'} />
            default:
                return null
        }
    })()

    return (
        <span
            className={className}
            aria-hidden={'true'}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size }}
        >
            {glyph}
        </span>
    )
}
