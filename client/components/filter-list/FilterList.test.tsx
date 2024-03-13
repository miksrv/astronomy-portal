import { ApiModel } from '@/api'
import { render, screen } from '@testing-library/react'
import React from 'react'

import FilterList from './FilterList'

describe('FilterList Component', () => {
    it('renders without errors when filters are provided', () => {
        const filters: ApiModel.Filter.ListItems = {
            hydrogen: {
                exposure: 300,
                frames: 5
            },
            luminance: {
                exposure: 600,
                frames: 10
            }
        }

        render(<FilterList filters={filters} />)

        expect(screen.getByText('luminance')).toBeInTheDocument()
        expect(screen.getByText('hydrogen')).toBeInTheDocument()
        expect(screen.getByText('10 минут (10 кадров)')).toBeInTheDocument()
        expect(screen.getByText('5 минут (5 кадров)')).toBeInTheDocument()
        expect(screen.queryByText('filter3')).toBeNull()
    })

    it('renders nothing when no filters are provided', () => {
        render(<FilterList />)
        expect(screen.queryByRole('ul')).toBeNull()
    })

    it('renders correct text when filters have different values', () => {
        const filters: ApiModel.Filter.ListItems = {
            hydrogen: {
                exposure: 60,
                frames: 1
            },
            luminance: {
                exposure: 600,
                frames: 10
            }
        }

        render(<FilterList filters={filters} />)

        expect(screen.getByText('10 минут (10 кадров)')).toBeInTheDocument()
        expect(screen.getByText('1 минута (1 кадр)')).toBeInTheDocument()
    })
})
