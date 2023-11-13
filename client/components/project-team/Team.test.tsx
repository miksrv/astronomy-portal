import { render, screen } from '@testing-library/react'
import React from 'react'

import Team, { teamList } from './Team'

describe('Team Component', () => {
    it('should render team members with names and photos', () => {
        render(<Team />)

        const teamMembers = screen.getAllByRole('listitem')
        expect(teamMembers).toHaveLength(6)

        teamMembers.forEach((member, index) => {
            const name = screen.getByText(teamList?.[index]?.name || '')
            expect(name).toBeInTheDocument()

            // Проверяем наличие фото
            const photo = screen.getByRole('img', {
                name: teamList[index].name
            })
            expect(photo).toBeInTheDocument()
        })
    })

    it('should have alt text for each photo', () => {
        render(<Team />)

        teamList.forEach((member) => {
            const photo = screen.getByRole('img', { name: member.name })
            expect(photo).toHaveAttribute('alt', member.name)
        })
    })

    it('should have correct image sources for each member', () => {
        render(<Team />)

        teamList.forEach((member) => {
            const photo = screen.getByRole('img', { name: member.name })
            expect(photo).toHaveAttribute('src', member.photo?.src)
        })
    })

    it('should have correct dimensions for each photo', () => {
        render(<Team />)

        teamList.forEach((member) => {
            const photo = screen.getByRole('img', { name: member.name })
            expect(photo).toHaveAttribute('width', String(member.photo?.width))
            expect(photo).toHaveAttribute(
                'height',
                String(member.photo?.height)
            )
        })
    })
})
