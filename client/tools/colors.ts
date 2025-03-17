// Soft colors
// export const colors = {
//     violet: ['#b43dc6', '#c35adb'], // Violet
//     purple: ['#9b51e0', '#ae71e7'], // Purple
//     magenta: ['#d62d7c', '#e05799'],// Magenta
//     red: ['#ea5545', '#f16b63'],    // Red
//     pink: ['#f46a9b', '#f783b0'],   // Pink
//     orange: ['#ef9b1f', '#f1aa41'], // Orange
//     yellow: ['#ede15c', '#f1e877'], // Yellow
//     lime: ['#bdcf32', '#c6da4d'],   // Lime
//     green: ['#7cc42c', '#97d74a'],  // Green
//     teal: ['#27a69a', '#4db9b1'],   // Teal
//     blue: ['#25afef', '#4fbaf2'],   // Blue
//     cyan: ['#2f9cc3', '#59b3d5'],   // Cyan
//     olive: ['#a4a43d', '#b7b74d'],  // Olive
//     brown: ['#8b572a', '#a26b42'],  // Brown
//     navy: ['#34495e', '#4b6a7f'],   // Navy
//     grey: ['#7f8c8d', '#9ea4a5']    // Grey
// }
import { ApiModel } from '@/api'

export const colors = {
    air: ['#8dbdef', '#9bc4f5'], // Air
    blue: ['#2c7eec', '#468de8'], // Blue
    brown: ['#795548', '#8d6e63'], // Brown
    cyan: ['#00bcd4', '#4dd0e1'], // Cyan
    green: ['#4caf50', '#66bb6a'], // Green
    grey: ['#607d8b', '#78909c'], // Grey
    lightblue: ['#2196f3', '#42a5f5'], // Light Blue
    lime: ['#cddc39', '#d4e157'], // Lime
    magenta: ['#c2185b', '#db3c7f'], // Magenta
    navy: ['#283593', '#3f51b5'], // Navy
    olive: ['#8c9e35', '#a3b236'], // Olive
    orange: ['#ff5722', '#ff7043'], // Orange
    pink: ['#e91e63', '#ff5b85'], // Pink
    purple: ['#7d2ae8', '#9146ff'], // Purple
    red: ['#e53935', '#f25755'], // Red
    teal: ['#009688', '#26a69a'], // Teal
    violet: ['#8c1fc9', '#a23de3'], // Violet
    yellow: ['#ffeb3b', '#fff176'] // Yellow
}

export const getFilterColorType = (
    filter?: ApiModel.FilterTypes
): keyof typeof colors | undefined => {
    switch (filter) {
        case 'L':
            return 'grey'
        case 'R':
            return 'red'
        case 'G':
            return 'green'
        case 'B':
            return 'blue'
        case 'H':
            return 'teal'
        case 'O':
            return 'cyan'
        case 'S':
            return 'magenta'
        case 'N':
            return 'air'
        default:
            return undefined
    }
}

export const getSensorColorType = (
    sensor?: keyof ApiModel.Weather
): keyof typeof colors => {
    switch (sensor) {
        case 'temperature':
            return 'red'
        case 'feelsLike':
            return 'orange'
        case 'pressure':
            return 'purple'
        case 'humidity':
            return 'cyan'
        case 'dewPoint':
            return 'lightblue'
        case 'visibility':
            return 'air'
        case 'uvIndex':
            return 'violet'
        case 'solEnergy':
            return 'yellow'
        case 'solRadiation':
            return 'lime'
        case 'clouds':
            return 'navy'
        case 'precipitation':
            return 'blue'
        case 'windSpeed':
            return 'green'
        case 'windGust':
            return 'teal'
        case 'windDeg':
            return 'olive'
        default:
            return 'grey'
    }
}

export const getSensorColor = (sensor?: keyof ApiModel.Weather): string[] => {
    const sensorColor = getSensorColorType(sensor)

    return colors[sensorColor]
}

export const getFilterColor = (
    filter?: ApiModel.FilterTypes
): string | undefined => {
    const filterColor = getFilterColorType(filter)

    if (filterColor) {
        return colors[filterColor][0]
    }

    return undefined
}
