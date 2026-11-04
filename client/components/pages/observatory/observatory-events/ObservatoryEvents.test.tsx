import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { ObservatoryEvents } from './ObservatoryEvents'

jest.mock('@/api', () => ({ ApiModel: {} }))

jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({
        i18n: { language: 'ru' },
        t: (_key: string, fallback: string) => fallback
    })
}))

jest.mock('simple-react-ui-kit', () => {
    const actual = jest.requireActual('../../../../__mocks__/simple-react-ui-kit')

    return {
        ...actual,
        Container: ({ header, children }: { header?: React.ReactNode; children?: React.ReactNode }) => (
            <div>
                {header}
                {children}
            </div>
        )
    }
})

const events = Array.from({ length: 16 }, (_, index) => ({
    id: 100 - index,
    type: index === 0 ? 'weather_alert' : 'roof_closed',
    device: null,
    time: `2026-11-03T${String(20 - index).padStart(2, '0')}:00:00Z`
}))

describe('ObservatoryEvents', () => {
    it('groups by day and reveals more on demand', () => {
        render(
            <ObservatoryEvents
                events={events}
                now={new Date('2026-11-03T21:00:00Z')}
            />
        )

        // Today's group has no heading
        expect(screen.queryByText('Сегодня')).not.toBeInTheDocument()
        expect(screen.getByText('Погода: опасные условия')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem')).toHaveLength(12)

        fireEvent.click(screen.getByText('Показать ещё'))

        expect(screen.getAllByRole('listitem')).toHaveLength(16)
        expect(screen.queryByText('Показать ещё')).not.toBeInTheDocument()
    })

    it('has an empty, an error and a loading state', () => {
        const { rerender } = render(<ObservatoryEvents events={[]} />)

        expect(screen.getByText('Событий пока нет')).toBeInTheDocument()

        rerender(<ObservatoryEvents error={true} />)
        expect(screen.getByText('Не удалось загрузить события')).toBeInTheDocument()

        rerender(<ObservatoryEvents loading={true} />)
        expect(screen.queryByText('Событий пока нет')).not.toBeInTheDocument()
    })
})
