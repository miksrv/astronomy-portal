// Manual mock of `next/router`, applied to every test automatically (a node module mock
// next to `node_modules`). jsdom has no Next router context, so `useRouter()` returns a
// stub router. A test that needs other values or asserts on navigation sets its own:
// `jest.mocked(useRouter).mockReturnValue({ asPath: '/x', push } as unknown as NextRouter)`.
import type { NextRouter } from 'next/router'

const createMockRouter = (overrides: Partial<NextRouter> = {}): NextRouter =>
    ({
        asPath: '/',
        basePath: '',
        pathname: '/',
        route: '/',
        query: {},
        isReady: true,
        isFallback: false,
        isLocaleDomain: false,
        isPreview: false,
        locale: 'ru',
        defaultLocale: 'ru',
        locales: ['ru', 'en'],
        push: jest.fn(() => Promise.resolve(true)),
        replace: jest.fn(() => Promise.resolve(true)),
        reload: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(() => Promise.resolve()),
        beforePopState: jest.fn(),
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
        ...overrides
    }) as NextRouter

export const useRouter = jest.fn(() => createMockRouter())
