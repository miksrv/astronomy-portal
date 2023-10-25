import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import AstronomyCalc from './AstronomyCalc'

describe('AstronomyCalc', () => {
    it('renders without errors', () => {
        const { container } = render(<AstronomyCalc />)
        expect(container).toBeInTheDocument()
    })

    it('displays sunrise and sunset times for the Sun', () => {
        render(<AstronomyCalc />)
        expect(screen.getByText('Солнце')).toBeInTheDocument()
        expect(screen.getByText('↑ Рассвет:')).toBeInTheDocument()
        expect(screen.getAllByText('↓ Закат:').length).toBe(2)
    })

    it('displays altitude and azimuth for the Sun', () => {
        render(<AstronomyCalc />)
        expect(screen.getByText('Солнце')).toBeInTheDocument()
        expect(screen.getAllByText('Азимут:').length).toBe(2)
        expect(screen.getAllByText('Высота:').length).toBe(2)
    })

    it('displays sunrise and sunset times for the Moon', () => {
        render(<AstronomyCalc />)
        expect(screen.getByText('Луна')).toBeInTheDocument()
        expect(screen.getByText('↑ Восход:')).toBeInTheDocument()
        expect(screen.getAllByText('↓ Закат:').length).toBe(2)
    })

    it('displays altitude and azimuth for the Moon', () => {
        render(<AstronomyCalc />)
        expect(screen.getByText('Луна')).toBeInTheDocument()
        expect(screen.getAllByText('Высота:').length).toBe(2)
        expect(screen.getAllByText('Азимут:').length).toBe(2)
    })
})
