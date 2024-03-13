export enum Type {
    luminance = 'luminance',
    red = 'red',
    green = 'green',
    blue = 'blue',
    hydrogen = 'hydrogen',
    oxygen = 'oxygen',
    sulfur = 'sulfur',
    clear = 'clear'
}

export type Item = {
    exposure: number
    frames: number
}

export type ListItems = {
    luminance?: Item
    red?: Item
    green?: Item
    blue?: Item
    hydrogen?: Item
    oxygen?: Item
    sulfur?: Item
    clear?: Item
}

export const List: Type[] = [
    Type.luminance,
    Type.red,
    Type.green,
    Type.blue,
    Type.hydrogen,
    Type.oxygen,
    Type.sulfur
]
