import React from 'react'

import { render, screen } from '@testing-library/react'

import { EventRow } from './EventRow'

describe('EventRow', () => {
    const props = {
        coverFileExt: 'webp',
        coverFileName: 'cover',
        date: '2026-08-12 17:00:00',
        id: 'e1',
        location: 'Астрономическая площадка',
        membersCount: 1611,
        title: 'Персеиды'
    }

    it('makes the title the one link of the card', () => {
        render(<EventRow {...props} />)

        expect(screen.getAllByRole('link')).toHaveLength(1)
        expect(screen.getByRole('link', { name: 'Персеиды' })).toHaveAttribute('href', '/stargazing/e1')
    })

    it('puts the place and the participants on one meta line', () => {
        const { container } = render(<EventRow {...props} />)

        const meta = screen.getByText('Астрономическая площадка').parentElement

        expect(meta).toHaveTextContent(/Астрономическая площадка.*1\s611 участников/)
        expect(container.querySelector('a a')).toBeNull()
    })

    it('gives an editor the statistics as a link on the meta line, never inside the card link', () => {
        const { container } = render(
            <EventRow
                {...props}
                statisticHref={'/stargazing/e1/statistic'}
            />
        )

        const statistic = screen.getByRole('link', { name: /участников/ })

        expect(statistic).toHaveAttribute('href', '/stargazing/e1/statistic')
        expect(statistic.parentElement).toBe(screen.getByText('Астрономическая площадка').parentElement)
        expect(container.querySelector('a a')).toBeNull()
    })
})
