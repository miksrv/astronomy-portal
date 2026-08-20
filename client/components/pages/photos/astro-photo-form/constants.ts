import { ApiModel } from '@/api'

// Preset equipment sets
export const equipmentPresets = [
    { name: 'HEQ5 + ASI1600', equipments: [1, 5, 7, 10, 12, 14, 15, 17] },
    { name: 'EQ6 + ASI6200', equipments: [2, 5, 8, 11, 13, 14, 16, 18] },
    { name: 'Dob + Canon', equipments: [4, 9] }
]

export const FILTER_KEYS = Object.keys(ApiModel.filters) as ApiModel.FilterTypes[]
