declare module '*.sass' {
    const content: { [className: string]: string }
    export = content
}

declare module 'd3-celestial'
declare module 'd3-geo-projection'
declare module 'suncalc'

declare let Celestial: any
