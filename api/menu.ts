type TMenuItems = {
    link: string
    name: string
    label?: 'photos' | 'objects'
}

export const MENU_ITEMS: TMenuItems[] = [
    { link: '/', name: 'Сводная' },
    { link: '/news', name: 'Новости' },
    { link: '/map', name: 'Карта' },
    { label: 'photos', link: '/photos', name: 'Фото' },
    { label: 'objects', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Телескоп' }
]
