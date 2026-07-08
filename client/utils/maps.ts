export const getYandexMapLink = (latitude: number, longitude: number): string =>
    `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`

export const getGoogleMapLink = (latitude: number, longitude: number): string =>
    `https://www.google.com/maps?q=${latitude},${longitude}`
