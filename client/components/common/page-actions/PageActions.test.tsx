import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { useAppSelector } from '@/api'

import { PageAction, PageActions } from './PageActions'

jest.mock('@/api', () => ({
    ApiModel: {},
    useAppSelector: jest.fn()
}))

jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({ t: (_key: string, defaultValue: string) => defaultValue })
}))

const asUser = (permissions?: string[]) =>
    (useAppSelector as jest.Mock).mockImplementation((selector) =>
        selector({ auth: { user: permissions ? { id: 'user-1', permissions } : undefined } })
    )

const onDelete = jest.fn()

const actions = [
    { key: 'delete', label: 'Удалить', variant: 'negative', onClick: onDelete, permission: 'events.delete' },
    { key: 'edit', label: 'Редактировать', link: '/edit', permission: 'events.update' },
    { key: 'stats', label: 'Статистика', link: '/stats', permission: ['events.statistic', 'events.users'] }
] as unknown as PageAction[]

describe('PageActions', () => {
    beforeEach(() => jest.clearAllMocks())

    it('renders nothing for a guest', () => {
        asUser(undefined)
        const { container } = render(<PageActions actions={actions} />)

        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when the viewer has none of the privileges', () => {
        asUser(['photos.manage'])
        const { container } = render(<PageActions actions={actions} />)

        expect(container.firstChild).toBeNull()
    })

    it('shows only the items the viewer may use, any of a list being enough', () => {
        asUser(['events.users'])
        render(<PageActions actions={actions} />)

        expect(screen.getByText('Статистика').closest('a')?.getAttribute('href')).toBe('/stats')
        expect(screen.queryByText('Редактировать')).toBeNull()
        expect(screen.queryByText('Удалить')).toBeNull()
    })

    it('puts a destructive action last and runs it on click', () => {
        asUser(['events.delete', 'events.update', 'events.statistic'])
        render(<PageActions actions={actions} />)

        const labels = screen.getAllByRole('listitem').map((item) => item.textContent)
        expect(labels[labels.length - 1]).toContain('Удалить')

        fireEvent.click(screen.getByText('Удалить'))
        expect(onDelete).toHaveBeenCalled()
    })
})
