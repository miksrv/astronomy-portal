import { api } from '@/api/api'
import { RootState, reducers } from '@/api/store'
import { configureStore } from '@reduxjs/toolkit'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

type WrapperProps = {
    children: React.ReactNode
}

export const testStore = (state: Partial<RootState>) => {
    return configureStore({
        middleware: (gDM) => gDM().concat(api.middleware),
        preloadedState: state,
        reducer: reducers
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
