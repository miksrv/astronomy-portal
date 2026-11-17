// Manual mock of `@/api`, enabled per test file with `jest.mock('@/api')`.
//
// Every RTK Query hook, `API.util.*` and `API.endpoints.*.initiate` is an auto-generated
// `jest.fn()` built from the real API slice, so a test only configures the hooks its
// component calls (`jest.mocked(API.useXQuery).mockReturnValue(...)`) and a mistyped hook
// name fails instead of silently returning `undefined`. Models, types and constants stay
// real: they carry no side effects and the enums (`ApiModel.Permission`, `ApiModel.filters`)
// must match what the components compare against.
const actual = jest.requireActual<typeof import('..')>('..')
const automock = jest.createMockFromModule<typeof import('..')>('..')

export const { HOST_API, HOST_IMG, SITE_LINK, ApiModel, ApiType, encodeQueryData } = actual

export const { API, APIMeteo, setLocale, useAppDispatch, useAppSelector, wrapper } = automock
