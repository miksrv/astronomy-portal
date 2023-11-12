import { renderWithStore } from '@/setupTests.config'
import { screen } from '@testing-library/react'

import { menuItems } from '@/components/header/Header'

import Sidebar from './Sidebar'

const customInitialState = {
    sidebar: {
        visible: true
    }
}

describe('Sidebar', () => {
    it('renders Sidebar component', () => {
        renderWithStore(<Sidebar />, customInitialState)

        menuItems.forEach((item) =>
            expect(screen.getByText(item.name)).toBeInTheDocument()
        )
    })
})
