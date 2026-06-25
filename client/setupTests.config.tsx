import React, { ClassAttributes } from 'react'

// import { Provider } from 'react-redux'
// eslint-disable-next-line import/no-extraneous-dependencies
import '@testing-library/jest-dom'

// import { API } from '@/api/api'
// import { reducer, RootState } from '@/api/store'
// import { configureStore } from '@reduxjs/toolkit'
// import { render } from '@testing-library/react'

// type WrapperProps = {
//     children: React.ReactNode
// }

jest.mock('next/image', () => ({
    __esModule: true,

    // Next.js static image imports resolve to an object ({ src, height, width });
    // normalize it to the string the real component would render.
    default: ({ src, ...props }: ClassAttributes<HTMLImageElement> & { src?: unknown }) => {
        const resolvedSrc = src && typeof src === 'object' ? (src as { src?: string }).src : src

        return (
            <img
                src={resolvedSrc as string}
                {...props}
            />
        )
    }
}))

// export const testStore = (state: Partial<RootState>) => {
//     return configureStore({
//         middleware: (gDM) => gDM().concat(API.middleware) as any,
//         preloadedState: state,
//         reducer: reducer as any
//     })
// }

// export const renderWithStore = (component: React.ReactElement, initialState: any) => {
//     const Wrapper: React.FC<WrapperProps> = ({ children }) => (
//         <Provider store={testStore(initialState)}>{children}</Provider>
//     )
//
//     return render(component, { wrapper: Wrapper })
// }
