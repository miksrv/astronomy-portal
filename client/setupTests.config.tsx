import { API } from '@/api/api'
import { RootState, reducer } from '@/api/store'
import { configureStore } from '@reduxjs/toolkit'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

type WrapperProps = {
    children: React.ReactNode
}

jest.mock('next/image', () => ({
    __esModule: true,
    /* eslint-disable-next-line */
    default: (props: any) => <img {...props} />
}))

export const testStore = (state: Partial<RootState>) => {
    return configureStore({
        middleware: (gDM) => gDM().concat(API.middleware) as any,
        preloadedState: state,
        reducer: reducer as any
    })
}

export const renderWithStore = (
    component: React.ReactElement,
    initialState: any
) => {
    const Wrapper: React.FC<WrapperProps> = ({ children }) => (
        <Provider store={testStore(initialState)}>{children}</Provider>
    )

    return render(component, { wrapper: Wrapper })
}
