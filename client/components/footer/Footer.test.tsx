import packageInfo from '@/package.json'
import { render, screen } from '@testing-library/react'

import { update } from '@/update'

import Footer from './Footer'

describe('Footer', () => {
    it('renders the footer correctly', () => {
        render(<Footer />)
        const footer = screen.getByTestId('footer')
        expect(footer).toBeInTheDocument()
    })

    it('displays the "Powered by" text', () => {
        render(<Footer />)
        const poweredByText = screen.getByText(
            'Powered by Arduino, PHP + MySQL, NextJS + TS + Redux.'
        )
        expect(poweredByText).toBeInTheDocument()
    })

    it('displays the copyright information', () => {
        render(<Footer />)

        expect(screen.getByText(/Copyright ©/)).toBeInTheDocument()
    })

    it('displays the miksoft.pro link', () => {
        render(<Footer />)
        const miksoftLink = screen.getByText('Mik')
        expect(miksoftLink).toHaveAttribute('href', 'https://miksoft.pro')
    })

    it('displays the version information', () => {
        render(<Footer />)

        expect(screen.getByText(/Version/)).toBeInTheDocument()
        expect(screen.getByText(packageInfo.version)).toBeInTheDocument()
    })

    it('displays the update information', () => {
        render(<Footer />)

        expect(screen.getByText(`(${update})`)).toBeInTheDocument()
    })
})
