import { renderWithStore } from '@/setupTests.config'
import { screen } from '@testing-library/react'
import React from 'react'

import RelayList from './RelayList'

const customInitialState = {
    auth: {
        isAuth: true,
        user: {
            role: 'admin'
        }
    }
}

describe('RelayList', () => {
    it('should render a loading indicator when loading', () => {
        renderWithStore(<RelayList />, customInitialState)

        const loadingIndicator = screen.getByTestId('relay-list-loader')

        expect(loadingIndicator).toBeInTheDocument()
    })
})
