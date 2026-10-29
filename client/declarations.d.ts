declare module '*.sass' {
    const content: { [className: string]: string }
    export = content
}

declare module 'd3-celestial'
declare module 'd3-geo-projection'

declare let Celestial: any
declare let d3: any
