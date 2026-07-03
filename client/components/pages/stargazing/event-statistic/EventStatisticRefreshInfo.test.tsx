import React from 'react'

import { render, screen } from '@testing-library/react'

import { API } from '@/api'

import { EventStatisticRefreshInfo } from './EventStatisticRefreshInfo'

jest.mock('@/api', () => ({
    API: {
        useEventGetItemQuery: jest.fn(),
        useEventGetStatisticQuery: jest.fn()
    }
}))

jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback })
}))

const mockUseEventGetItemQuery = API.useEventGetItemQuery as jest.Mock
const mockUseEventGetStatisticQuery = API.useEventGetStatisticQuery as jest.Mock

beforeEach(() => {
    jest.clearAllMocks()
})

test('renders nothing while registration is closed', () => {
    mockUseEventGetItemQuery.mockReturnValue({
        data: { registrationEnd: { date: new Date(Date.now() - 86400000).toISOString() } }
    })
    mockUseEventGetStatisticQuery.mockReturnValue({ fulfilledTimeStamp: Date.now() })

    const { container } = render(<EventStatisticRefreshInfo eventId={'event-1'} />)

    expect(container).toBeEmptyDOMElement()
})

test('renders nothing while the first fetch has not resolved yet', () => {
    mockUseEventGetItemQuery.mockReturnValue({
        data: { registrationEnd: { date: new Date(Date.now() + 86400000).toISOString() } }
    })
    mockUseEventGetStatisticQuery.mockReturnValue({ fulfilledTimeStamp: undefined })

    const { container } = render(<EventStatisticRefreshInfo eventId={'event-1'} />)

    expect(container).toBeEmptyDOMElement()
})

test('shows the last-updated and next-update labels while registration is open', () => {
    mockUseEventGetItemQuery.mockReturnValue({
        data: { registrationEnd: { date: new Date(Date.now() + 86400000).toISOString() } }
    })
    mockUseEventGetStatisticQuery.mockReturnValue({ fulfilledTimeStamp: Date.now() })

    render(<EventStatisticRefreshInfo eventId={'event-1'} />)

    expect(screen.getByText('Обновлено', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Следующее обновление через', { exact: false })).toBeInTheDocument()
})
