import { renderWithStore } from '@/setupTests.config'
import { fireEvent, screen } from '@testing-library/react'

import CatalogToolbar from './CatalogToolbar'

const customInitialState = {
    auth: {
        isAuth: true,
        user: {
            role: 'admin'
        }
    }
}

describe('CatalogToolbar', () => {
    it('renders CatalogToolbar with search input', () => {
        renderWithStore(<CatalogToolbar search='' />, customInitialState)

        expect(screen.getByPlaceholderText('Поиск...')).toBeInTheDocument()
    })

    it('handles search input change', () => {
        const onChangeSearchMock = jest.fn()

        renderWithStore(
            <CatalogToolbar
                search=''
                onChangeSearch={onChangeSearchMock}
            />,
            customInitialState
        )

        fireEvent.change(screen.getByPlaceholderText('Поиск...'), {
            target: { value: 'New Search' }
        })

        expect(onChangeSearchMock).toHaveBeenCalledWith('New Search')
    })
})
