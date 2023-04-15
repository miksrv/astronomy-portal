export type TSortOrdering = 'ascending' | 'descending'

export type TSortKey = keyof TTableItem

export type TTableItem = {
    name: string
    title: string
    text: string
    updated: string
    category: string
    photo: number
    exposure: number
    frames: number
    luminance: number
    red: number
    green: number
    blue: number
    oxygen: number
    hydrogen: number
    sulfur: number
    clear: number
}
