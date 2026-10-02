import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { ConstellationLinesIcon, DeepSkyIcon, PlanetIcon, RadiantIcon, StarIcon } from '@/components/icons'

import { SearchItemKind } from './searchIndex'

import styles from './styles.module.sass'

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

    // Only the size is per-instance; the layout lives in the .kindIcon class
    return (
        <span
            className={cn(styles.kindIcon, className)}
            aria-hidden={'true'}
            style={{ fontSize: size }}
        >
            {glyph}
        </span>
    )
}
