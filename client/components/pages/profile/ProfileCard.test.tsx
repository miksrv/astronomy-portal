import React from 'react'

import { useRouter } from 'next/router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'
import { pushSnackbar } from '@/api/applicationSlice'

import { ProfileCard } from './ProfileCard'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))

// A save success/generic-error message is no longer rendered inline by
// ProfileCard itself - it's pushed as a snackbar (see useSnackbar), so tests
// below assert against dispatched actions rather than DOM text for those.
const mockDispatch = jest.fn()

jest.mock('@/api', () => ({
    API: {
        useAuthUpdateProfileMutation: jest.fn()
    },
    HOST_IMG: 'https://example.test/img',
    useAppDispatch: () => mockDispatch
}))

const mockUpdateProfile = jest.fn()

const baseUser = {
    id: 'user-1',
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    phone: '',
    birthday: '',
    sex: undefined
}

const defaultMutationState = { isLoading: false }

beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ asPath: '/profile', push: jest.fn() })
    ;(API.useAuthUpdateProfileMutation as jest.Mock).mockReturnValue([mockUpdateProfile, defaultMutationState])
})

describe('ProfileCard', () => {
    it('renders nothing while the user is not yet loaded', () => {
        const { container } = render(<ProfileCard user={undefined} />)

        expect(container).toBeEmptyDOMElement()
    })

    it('shows a validation error and does not submit when the required name field is empty', async () => {
        const { container } = render(<ProfileCard user={baseUser} />)

        const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: '' } })

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(screen.getByText('Введите имя')).toBeDefined()
        })

        expect(mockUpdateProfile).not.toHaveBeenCalled()
    })

    it('submits the profile and shows a success message', async () => {
        mockUpdateProfile.mockReturnValue({ unwrap: () => Promise.resolve({ user: baseUser }) })
        const { container } = render(<ProfileCard user={baseUser} />)

        const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'Пётр Петров' } })

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith({
                name: 'Пётр Петров',
                phone: undefined,
                birthday: undefined,
                sex: undefined
            })
        })

        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: pushSnackbar.type,
                    payload: expect.objectContaining({ type: 'success', message: 'Профиль обновлён' })
                })
            )
        })
    })

    it('rejects a phone number that is too short', async () => {
        const { container } = render(<ProfileCard user={baseUser} />)

        const phoneInput = container.querySelector('input[name="phone"]') as HTMLInputElement
        fireEvent.change(phoneInput, { target: { value: '123' } })

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(screen.getByText('Введите корректный номер телефона')).toBeDefined()
        })

        expect(mockUpdateProfile).not.toHaveBeenCalled()
    })

    it('surfaces a server-side field error returned for the phone field', async () => {
        mockUpdateProfile.mockReturnValue({
            unwrap: () =>
                Promise.reject({
                    message: 'Не удалось сохранить профиль',
                    errors: { phone: 'Этот номер уже используется' }
                })
        })
        render(<ProfileCard user={baseUser} />)

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        expect(await screen.findByText('Этот номер уже используется')).toBeDefined()

        // Field-tied errors stay inline (plus a scroll to the field) - a
        // generic snackbar on top would just be noise, since there's no
        // extra field for it to point at.
        expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: pushSnackbar.type }))
    })
})
