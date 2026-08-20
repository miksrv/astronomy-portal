export const getChildAgeGroup = (age: number): string => {
    if (age <= 6) {
        return '5to6'
    }
    if (age <= 8) {
        return '7to8'
    }
    if (age <= 10) {
        return '9to10'
    }
    if (age <= 12) {
        return '11to12'
    }
    if (age <= 14) {
        return '13to14'
    }
    return '15to17'
}
