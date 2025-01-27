import { ApiModel } from '@/api'

export const filters = {
    L: 'L',
    R: 'R',
    G: 'G',
    B: 'B',
    H: 'H',
    O: 'O',
    S: 'S',
    N: 'N'
} as const

export type FilterTypes = keyof typeof filters

export type Filters = {
    [K in FilterTypes]?: ApiModel.Statistic
}
