import { ApiType } from '@/api'
import { render, screen } from '@testing-library/react'
import React from 'react'

import Statistic from './Statistic'

const statistic: ApiType.Statistic.ResGeneral = {
    exposure: 300,
    filesize: 1024,
    frames: 10,
    objects: 5,
    photos: 10
}

describe('Statistic', () => {
    it('renders statistic cards', () => {
        render(<Statistic {...statistic} />)

        expect(screen.getByText('Кадров')).toBeInTheDocument()
        expect(screen.getByText('Выдержка')).toBeInTheDocument()
        expect(screen.getByText('Объектов')).toBeInTheDocument()
        expect(screen.getByText('Данных (Гб)')).toBeInTheDocument()

        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('00:05')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
    })
})
