import React from 'react'

import { render, screen } from '@testing-library/react'

import { LiveMeta } from './LiveMeta'

// Without an i18n instance `t` returns the default text as is: interpolate it like the real one
jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback: string, options?: Record<string, unknown>) =>
            fallback.replace(/{{(\w+)}}/g, (_match, name: string) => String(options?.[name] ?? ''))
    })
}))

describe('LiveMeta', () => {
    it('shows nothing while the age is unknown', () => {
        const { container } = render(<LiveMeta online={false} />)

        expect(container).toBeEmptyDOMElement()
    })

    it('says "just now" under a minute', () => {
        render(
            <LiveMeta
                online={true}
                minutesAgo={0}
            />
        )

        expect(screen.getByText('На связи')).toBeInTheDocument()
        expect(screen.getByText('обновлено только что')).toBeInTheDocument()
    })

    it('shows the age of stale data with the offline badge', () => {
        render(
            <LiveMeta
                online={false}
                minutesAgo={42}
            />
        )

        expect(screen.getByText('Нет связи')).toBeInTheDocument()
        expect(screen.getByText('последняя связь 42 мин назад')).toBeInTheDocument()
    })

    it('says "switched off" in grey when being offline is normal', () => {
        render(
            <LiveMeta
                online={false}
                minutesAgo={3 * 24 * 60}
                quiet={true}
            />
        )

        expect(screen.getByText('Выключена')).toBeInTheDocument()
        expect(screen.getByText('последняя связь 3 дн назад')).toBeInTheDocument()
    })
})
