import { useStatisticGetQuery } from '@/api/api'
import { render, screen } from '@testing-library/react'
import React from 'react'

import Statistic from './Statistic'

jest.mock('@/api/api', () => ({
    ...jest.requireActual('@/api/api'),
    useStatisticGetQuery: jest.fn()
}))

describe('Statistic', () => {
    beforeEach(() => {
        ;(useStatisticGetQuery as jest.Mock).mockReturnValue({
            data: {
                exposure: 300,
                filesize: 1024, // 1 GB
                frames: 10,
                objects: 5
            },
            isLoading: false
        })
    })

    it('renders statistic cards', () => {
        render(<Statistic />)

        expect(screen.getByText('Кадров')).toBeInTheDocument()
        expect(screen.getByText('Выдержка')).toBeInTheDocument()
        expect(screen.getByText('Объектов')).toBeInTheDocument()
        expect(screen.getByText('Данных (Гб)')).toBeInTheDocument()

        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('300')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('displays loader while loading', () => {
        ;(useStatisticGetQuery as jest.Mock).mockReturnValue({
            data: undefined,
            isLoading: true
        })

        render(<Statistic />)

        expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not display loader when not loading', () => {
        render(<Statistic />)

        expect(screen.queryByTestId('loader')).toBeNull()
    })
})
