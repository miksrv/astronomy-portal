import React from 'react'

/**
 * Compact 24×24 line icons for the star map's quick layer bar — layers the kit's icon
 * set has no glyph for (constellation lines/names, graticule, deep-sky, Milky Way,
 * meteor radiants, horizon view, atmosphere), for the map rail's view controls (zoom
 * in/out, fit view) and for the settings panel's time-flow transport (rewind, slow down,
 * pause, speed up, fast forward). Same footprint as a kit `Icon`: `currentColor`,
 * sized by the parent, decorative (`aria-hidden`).
 */

type LayerIconProps = React.SVGProps<SVGSVGElement>

const Svg: React.FC<LayerIconProps> = ({ children, ...props }) => (
    <svg
        width={18}
        height={18}
        viewBox={'0 0 24 24'}
        fill={'none'}
        stroke={'currentColor'}
        strokeWidth={1.8}
        strokeLinecap={'round'}
        strokeLinejoin={'round'}
        aria-hidden={'true'}
        focusable={'false'}
        // The kit Button styles `svg { fill: currentColor }` for its own glyphs — an
        // inline style keeps these outline icons hollow (filled parts opt in per shape)
        style={{ fill: 'none' }}
        {...props}
    >
        {children}
    </svg>
)

/** Four stars joined by constellation lines */
export const ConstellationLinesIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <path d={'M5 18 9 8l7 4 3-7'} />
        <circle
            cx={5}
            cy={18}
            r={1.6}
            fill={'currentColor'}
            stroke={'none'}
        />
        <circle
            cx={9}
            cy={8}
            r={1.6}
            fill={'currentColor'}
            stroke={'none'}
        />
        <circle
            cx={16}
            cy={12}
            r={1.6}
            fill={'currentColor'}
            stroke={'none'}
        />
        <circle
            cx={19}
            cy={5}
            r={1.6}
            fill={'currentColor'}
            stroke={'none'}
        />
    </Svg>
)

/** A star with a text label next to it */
export const ConstellationNamesIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={5.5}
            cy={17}
            r={1.8}
            fill={'currentColor'}
            stroke={'none'}
        />
        <path d={'M10 19 14 8l4 11M11.6 15h4.8'} />
    </Svg>
)

/** Globe-like coordinate grid */
export const GraticuleIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={12}
            cy={12}
            r={9}
        />
        <path d={'M3 12h18M12 3c-3.2 2.8-3.2 15.2 0 18M12 3c3.2 2.8 3.2 15.2 0 18M5 7.5h14M5 16.5h14'} />
    </Svg>
)

/** Spiral galaxy: bright core with two arms */
export const DeepSkyIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={12}
            cy={12}
            r={2}
            fill={'currentColor'}
            stroke={'none'}
        />
        <path d={'M12 6.5c4 0 6.5 2.5 6.5 5.5M12 17.5c-4 0-6.5-2.5-6.5-5.5'} />
        <path d={'M17.5 12c0 3-2.5 4.5-4 4.5M6.5 12c0-3 2.5-4.5 4-4.5'} />
    </Svg>
)

/** Diagonal star band */
export const MilkyWayIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <path
            d={'M3 17c3-6 6-8 9-9s6-1.5 9-5c-1 5-4 8-8 10s-7 2-10 4Z'}
            fill={'currentColor'}
            fillOpacity={0.25}
            stroke={'none'}
        />
        <path d={'M3 17c3-6 6-8 9-9s6-1.5 9-5'} />
        <circle
            cx={8}
            cy={13}
            r={1}
            fill={'currentColor'}
            stroke={'none'}
        />
        <circle
            cx={13}
            cy={10}
            r={1}
            fill={'currentColor'}
            stroke={'none'}
        />
        <circle
            cx={17}
            cy={6.5}
            r={1}
            fill={'currentColor'}
            stroke={'none'}
        />
    </Svg>
)

/** Meteor radiant: a ring with four diverging rays (same glyph the map draws) */
export const RadiantIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={12}
            cy={12}
            r={3}
        />
        <path d={'m6 6 2.5 2.5M18 6l-2.5 2.5M6 18l2.5-2.5M18 18l-2.5-2.5'} />
    </Svg>
)

/** Sky dome over a horizon with a hill */
export const HorizonIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <path d={'M3 16a9 9 0 0 1 18 0'} />
        <path d={'M2 19h5l3-2.5 3 2.5h9'} />
        <circle
            cx={12}
            cy={9}
            r={1.2}
            fill={'currentColor'}
            stroke={'none'}
        />
    </Svg>
)

/** Atmosphere: a sun low over the horizon with haze layers beneath it */
export const AtmosphereIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <path d={'M7.5 13a4.5 4.5 0 0 1 9 0'} />
        <path d={'M12 4.5v1.8M5.2 7.2l1.3 1.3M18.8 7.2l-1.3 1.3M3 13h2.2M18.8 13H21'} />
        <path d={'M3 16.5h18M5 19.5h14'} />
    </Svg>
)

/** Magnifier with a plus — zoom in */
export const ZoomInIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={10.5}
            cy={10.5}
            r={6.5}
        />
        <path d={'M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6'} />
    </Svg>
)

/** Magnifier with a minus — zoom out */
export const ZoomOutIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={10.5}
            cy={10.5}
            r={6.5}
        />
        <path d={'M15.5 15.5 21 21M7.5 10.5h6'} />
    </Svg>
)

/** Four-pointed star — a single star in search results / the info popup */
export const StarIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <path
            d={'M12 3c.6 5 3.4 8.4 9 9-5.6.6-8.4 3.4-9 9-.6-5.6-3.4-8.4-9-9 5.6-.6 8.4-4 9-9Z'}
            fill={'currentColor'}
            fillOpacity={0.35}
        />
    </Svg>
)

/** Planet: a disc with a tilted ring */
export const PlanetIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={12}
            cy={12}
            r={5}
        />
        <path d={'M4.5 15.5c3.5 2.5 12 .5 16.5-4.5M3 13c0-1 1.4-2 3.6-2.6M20.4 13.6c.6-.6.6-1.6.1-2.6'} />
    </Svg>
)

/** A circle framed by four corner brackets — fit the whole view into the canvas */
export const FitViewIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <circle
            cx={12}
            cy={12}
            r={4.5}
        />
        <path d={'M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3'} />
    </Svg>
)

/**
 * Transport controls for the time flow, read the way a player's are: one triangle is the
 * small step, two the big one, left slows the clock down and right speeds it up. Solid
 * shapes (the outline `Svg` default is overridden per path) so they read at 18px.
 */
const Solid: React.FC<{ d: string }> = ({ d }) => (
    <path
        d={d}
        fill={'currentColor'}
        stroke={'none'}
    />
)

/** ◀◀ — slow the flow down by the big step */
export const RewindIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <Solid d={'M20.5 5.5 12.5 12l8 6.5Z'} />
        <Solid d={'M11.5 5.5 3.5 12l8 6.5Z'} />
    </Svg>
)

/** ◀ — slow the flow down by the small step */
export const SlowDownIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <Solid d={'M16 5.5 6.5 12l9.5 6.5Z'} />
    </Svg>
)

/** ▮▮ — stop the flow */
export const PauseIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <Solid d={'M8 5h2.6a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'} />
        <Solid d={'M13.4 5H16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'} />
    </Svg>
)

/** ▶ — speed the flow up by the small step */
export const SpeedUpIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <Solid d={'M8 5.5 17.5 12 8 18.5Z'} />
    </Svg>
)

/** ▶▶ — speed the flow up by the big step */
export const FastForwardIcon: React.FC<LayerIconProps> = (props) => (
    <Svg {...props}>
        <Solid d={'M3.5 5.5 11.5 12l-8 6.5Z'} />
        <Solid d={'M12.5 5.5 20.5 12l-8 6.5Z'} />
    </Svg>
)
