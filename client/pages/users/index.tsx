import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import {
    Badge,
    Container,
    Input,
    Select,
    SelectOptionType,
    Spinner,
    Table,
    TableColumnProps,
    TableSortConfig
} from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, ApiType, HOST_IMG, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import UserEventsDialog from '@/components/pages/users/UserEventsDialog'
import { Pagination } from '@/components/ui/pagination'
import { UserAvatar } from '@/components/ui/user-avatar'
import { formatDate } from '@/utils/dates'
import { minutesAgo } from '@/utils/helpers'

import styles from './styles.module.sass'

const LIMIT = 50
const DEFAULT_SORT_BY: ApiType.Users.UsersSortBy = 'createdAt'
const DEFAULT_SORT_DIR: ApiType.Users.UsersSortDir = 'desc'

const ROLE_OPTIONS = [
    { key: '', value: '' },
    { key: 'user', value: 'user' },
    { key: 'moderator', value: 'moderator' },
    { key: 'security', value: 'security' },
    { key: 'admin', value: 'admin' }
]

const AUTH_TYPE_OPTIONS = [
    { key: '', value: '' },
    { key: 'google', value: 'google' },
    { key: 'yandex', value: 'yandex' },
    { key: 'vk', value: 'vk' },
    { key: 'native', value: 'native' }
]

const roleBadgeClass = (role: ApiModel.UserRole): string => {
    const map: Partial<Record<ApiModel.UserRole, string>> = {
        [ApiModel.UserRole.ADMIN]: styles.badgeAdmin,
        [ApiModel.UserRole.MODERATOR]: styles.badgeModerator,
        [ApiModel.UserRole.SECURITY]: styles.badgeSecurity
    }

    return map[role] ?? styles.badgeDefault
}

const authTypeBadgeClass = (authType: ApiModel.UserAuthType): string => {
    const map: Record<ApiModel.UserAuthType, string> = {
        google: styles.badgeGoogle,
        yandex: styles.badgeYandex,
        vk: styles.badgeVk,
        native: styles.badgeDefault
    }

    return map[authType] ?? styles.badgeDefault
}

const UsersPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const pageTitle = t('users.pageTitle', 'Пользователи')

    const toolbarRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)
    const filtersRef = useRef<HTMLDivElement>(null)
    const paginationRef = useRef<HTMLDivElement>(null)
    const [tableHeight, setTableHeight] = useState<number | undefined>()

    const [search, setSearch] = useState<string>((router.query.search as string) || '')
    const [debouncedSearch, setDebouncedSearch] = useState<string>((router.query.search as string) || '')
    const [role, setRole] = useState<ApiModel.UserRole | ''>((router.query.role as ApiModel.UserRole) || '')
    const [authType, setAuthType] = useState<ApiModel.UserAuthType | ''>(
        (router.query.authType as ApiModel.UserAuthType) || ''
    )
    const [page, setPage] = useState<number>(parseInt((router.query.page as string) || '1', 10))
    const [sort, setSort] = useState<TableSortConfig<ApiModel.AdminUserItem>>({
        key: (router.query.sortBy as ApiType.Users.UsersSortBy) || DEFAULT_SORT_BY,
        direction: (router.query.sortDir as ApiType.Users.UsersSortDir) || DEFAULT_SORT_DIR
    })

    const [eventsUserId, setEventsUserId] = useState<string | undefined>()
    const [eventsUserName, setEventsUserName] = useState<string | undefined>()

    const { data, isLoading, isFetching } = API.useUsersGetListQuery({
        page,
        limit: LIMIT,
        search: debouncedSearch,
        role,
        authType,
        sortBy: sort.key as ApiType.Users.UsersSortBy,
        sortDir: sort.direction
    })

    // Calculate fixed table height
    useEffect(() => {
        const calculateTableHeight = () => {
            const containerHeight = document.documentElement.clientHeight
            const toolbarH = toolbarRef.current?.offsetHeight || 0
            const footerH = footerRef.current?.offsetHeight || 0
            const filtersH = filtersRef.current?.offsetHeight || 0
            const paginationH = paginationRef.current?.offsetHeight || 0

            setTableHeight(containerHeight - toolbarH - footerH - filtersH - paginationH - 135)
        }

        calculateTableHeight()
        window.addEventListener('resize', calculateTableHeight)

        return () => window.removeEventListener('resize', calculateTableHeight)
    }, [data])

    // Debounce search input — reset page on search change
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 400)

        return () => clearTimeout(timer)
    }, [search])

    // Sync all state → URL (shallow, no SSR re-fetch)
    useEffect(() => {
        const query: Record<string, string | number> = {}

        if (debouncedSearch) {
            query.search = debouncedSearch
        }
        if (role) {
            query.role = role
        }
        if (authType) {
            query.authType = authType
        }
        if (page > 1) {
            query.page = page
        }
        if (sort.key !== DEFAULT_SORT_BY) {
            query.sortBy = sort.key
        }
        if (sort.direction !== DEFAULT_SORT_DIR) {
            query.sortDir = sort.direction
        }

        void router.push({ pathname: '/users', query }, undefined, { shallow: true })
    }, [debouncedSearch, role, authType, page, sort])

    const handleRoleChange = useCallback((selected: Array<SelectOptionType<string>> | undefined) => {
        setRole((selected?.[0]?.key ?? '') as ApiModel.UserRole | '')
        setPage(1)
    }, [])

    const handleAuthTypeChange = useCallback((selected: Array<SelectOptionType<string>> | undefined) => {
        setAuthType((selected?.[0]?.key ?? '') as ApiModel.UserAuthType | '')
        setPage(1)
    }, [])

    const handleSort = useCallback((newSort: TableSortConfig<ApiModel.AdminUserItem>) => {
        setSort(newSort)
        setPage(1)
    }, [])

    const roleLabel = (r: ApiModel.UserRole | ''): string => {
        const map: Record<string, string> = {
            '': t('users.filterAll', 'Все'),
            admin: t('users.roleAdmin', 'Администратор'),
            moderator: t('users.roleModerator', 'Модератор'),
            security: t('users.roleSecurity', 'Охрана'),
            user: t('users.roleUser', 'Пользователь')
        }

        return map[r] ?? r
    }

    const authTypeLabel = (a: ApiModel.UserAuthType | ''): string => {
        const map: Record<string, string> = {
            '': t('users.filterAll', 'Все'),
            google: t('users.authGoogle', 'Google'),
            yandex: t('users.authYandex', 'Yandex'),
            vk: t('users.authVk', 'ВКонтакте'),
            native: t('users.authNative', 'Нативный')
        }

        return map[a] ?? a
    }

    const sexAgeLabel = (item: ApiModel.AdminUserItem): string => {
        const sexMap: Record<string, string> = { m: 'М', f: 'Ж' }
        const sexStr = item.sex ? sexMap[item.sex] : null

        if (!sexStr && !item.age) {
            return '—'
        }
        if (sexStr && item.age) {
            return `${sexStr}, ${item.age}`
        }
        if (sexStr) {
            return sexStr
        }

        return String(item.age)
    }

    const tableColumns: Array<TableColumnProps<ApiModel.AdminUserItem>> = [
        {
            accessor: 'name',
            header: t('users.columnUser', 'Пользователь'),
            isSortable: true,
            onChangeSort: handleSort,
            formatter: (_data, row, i) => {
                const item = row[i]

                return (
                    <div className={styles.userCell}>
                        <UserAvatar
                            size={'small'}
                            src={
                                item.avatar ? `${HOST_IMG}/users/${String(item.id)}/${String(item.avatar)}` : undefined
                            }
                            name={item.name}
                        />
                        <span>{item.name}</span>
                    </div>
                )
            }
        },
        {
            accessor: 'role',
            header: t('users.columnRole', 'Роль'),
            formatter: (data) => (
                <Badge
                    label={roleLabel(data as ApiModel.UserRole)}
                    size={'small'}
                    className={roleBadgeClass(data as ApiModel.UserRole)}
                />
            )
        },
        {
            accessor: 'authType',
            header: t('users.columnService', 'Сервис'),
            formatter: (data) => (
                <Badge
                    label={authTypeLabel(data as ApiModel.UserAuthType)}
                    size={'small'}
                    className={authTypeBadgeClass(data as ApiModel.UserAuthType)}
                />
            )
        },
        {
            accessor: 'age',
            header: t('users.columnAge', 'Пол / Возраст'),
            formatter: (_data, row, i) => sexAgeLabel(row[i])
        },
        {
            accessor: 'eventsCount',
            header: t('users.columnEvents', 'Мероприятий'),
            isSortable: true,
            onChangeSort: handleSort,
            formatter: (data, row, i) => (
                <button
                    className={styles.eventsCountButton}
                    onClick={() => {
                        setEventsUserId(row[i].id)
                        setEventsUserName(row[i].name)
                    }}
                >
                    {data as number}
                </button>
            )
        },
        {
            accessor: 'activityAt',
            header: t('users.columnActivity', 'Активность'),
            isSortable: true,
            onChangeSort: handleSort,
            formatter: (data) => (data ? minutesAgo(data as string) : '—')
        },
        {
            accessor: 'createdAt',
            header: t('users.columnRegistered', 'Регистрация'),
            isSortable: true,
            onChangeSort: handleSort,
            formatter: (data) => formatDate(data as string, 'DD MMMM YYYY')
        }
    ]

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                ref={toolbarRef}
                title={pageTitle}
                currentPage={pageTitle}
            />

            <Container
                ref={filtersRef}
                className={styles.filtersRow}
            >
                {isFetching && <Spinner className={styles.loader} />}

                {data?.count !== undefined && t('users.totalCount', { count: data.count })}

                <Input
                    clearable={true}
                    value={search}
                    className={styles.searchInput}
                    placeholder={t('users.search', 'Поиск по имени')}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Select<string>
                    placeholder={t('users.filterRole', 'Роль')}
                    value={role}
                    className={styles.selectFilter}
                    onSelect={handleRoleChange}
                    options={ROLE_OPTIONS.map((o) => ({
                        key: o.key,
                        value: roleLabel(o.value as ApiModel.UserRole | '')
                    }))}
                />

                <Select<string>
                    placeholder={t('users.filterAuthType', 'Сервис входа')}
                    value={authType}
                    className={styles.selectFilter}
                    onSelect={handleAuthTypeChange}
                    options={AUTH_TYPE_OPTIONS.map((o) => ({
                        key: o.key,
                        value: authTypeLabel(o.value as ApiModel.UserAuthType | '')
                    }))}
                />
            </Container>

            <Container style={{ padding: '2px' }}>
                <Table<ApiModel.AdminUserItem>
                    size={'small'}
                    sort={sort}
                    data={data?.items || []}
                    columns={tableColumns}
                    loading={isLoading}
                    stickyHeader={true}
                    maxHeight={tableHeight}
                    defaultSort={{ key: DEFAULT_SORT_BY, direction: DEFAULT_SORT_DIR }}
                    noDataCaption={t('users.noUsers', 'Нет пользователей')}
                />
            </Container>

            {!!data?.count && data.count > LIMIT && (
                <Container
                    ref={paginationRef}
                    style={{ padding: '1px' }}
                >
                    <Pagination
                        currentPage={page}
                        totalItemsCount={data?.count ?? 0}
                        perPage={LIMIT}
                        hideIfOnePage={true}
                        onChangePage={setPage}
                        captionPage={t('users.paginationPage', 'Страница')}
                        captionNextPage={t('users.paginationNext', 'Следующая')}
                        captionPrevPage={t('users.paginationPrev', 'Предыдущая')}
                    />
                </Container>
            )}

            <UserEventsDialog
                userId={eventsUserId}
                userName={eventsUserName}
                onClose={() => {
                    setEventsUserId(undefined)
                    setEventsUserName(undefined)
                }}
            />

            <AppFooter ref={footerRef} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default UsersPage
