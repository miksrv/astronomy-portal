import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Badge,
    Button,
    Checkbox,
    Container,
    Dialog,
    Input,
    Message,
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

import { API, ApiModel, ApiType, HOST_IMG, useAppSelector, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import UserEventsDialog from '@/components/pages/users/UserEventsDialog'
import { Pagination } from '@/components/ui/pagination'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { DEVELOPER_ROLE_ID } from '@/utils/constants'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'
import { minutesAgo } from '@/utils/helpers'
import { hasPermission } from '@/utils/permissions'

import styles from './users.module.sass'

const LIMIT = 50
const DEFAULT_SORT_BY: ApiType.Users.UsersSortBy = 'createdAt'
const DEFAULT_SORT_DIR: ApiType.Users.UsersSortDir = 'desc'

// Parses the `roleIds` URL/query param (comma-separated ids, e.g. "1,3")
// back into a number array for the multi-select filter's initial state.
const parseRoleIdsParam = (value: string): number[] =>
    value
        .split(',')
        .map((part) => parseInt(part, 10))
        .filter((id) => !Number.isNaN(id))

const authTypeBadgeClass = (authType: ApiModel.UserAuthType): string => {
    const map: Record<ApiModel.UserAuthType, string> = {
        google: styles.badgeGoogle ?? '',
        yandex: styles.badgeYandex ?? '',
        vk: styles.badgeVk ?? '',
        native: styles.badgeDefault ?? ''
    }

    return map[authType] ?? styles.badgeDefault
}

const UsersPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const pageTitle = t('users.pageTitle', 'Пользователи')

    const toolbarRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)
    const paginationRef = useRef<HTMLDivElement>(null)
    const [tableHeight, setTableHeight] = useState<number | undefined>()

    const [search, setSearch] = useState<string>((router.query.search as string) || '')
    const [debouncedSearch] = useDebouncedValue(search, 400)
    const [roleFilterIds, setRoleFilterIds] = useState<number[]>(
        parseRoleIdsParam((router.query.roleIds as string) || '')
    )
    const [page, setPage] = useState<number>(parseInt((router.query.page as string) || '1', 10))
    const [sort, setSort] = useState<TableSortConfig<ApiModel.AdminUserItem>>({
        key: (router.query.sortBy as ApiType.Users.UsersSortBy) || DEFAULT_SORT_BY,
        direction: (router.query.sortDir as ApiType.Users.UsersSortDir) || DEFAULT_SORT_DIR
    })

    const [eventsUserId, setEventsUserId] = useState<string | undefined>()
    const [eventsUserName, setEventsUserName] = useState<string | undefined>()

    const [editRolesUser, setEditRolesUser] = useState<ApiModel.AdminUserItem | undefined>()
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
    // saveRolesError persists on the mutation hook until the next call —
    // gate display to only the attempt just made for the currently open
    // dialog, so a failure for one user doesn't resurface when a different
    // user's roles dialog is opened next.
    const [saveRolesAttempted, setSaveRolesAttempted] = useState(false)

    // The roles-edit tool below is gated on this in addition to the page-level
    // SSR guard (requirePermissionSSR) — belt-and-braces, mirroring the
    // convention elsewhere in the app (e.g. AppHeader's admin links) of never
    // relying solely on a route guard to hide privileged UI.
    const authUser = useAppSelector((state) => state.auth.user)
    const canManageRoles = hasPermission(authUser, ApiModel.Permission.USERS_MANAGE)

    const { data: rolesData } = API.useRolesGetListQuery()
    const [updateUserRoles, { isLoading: isSavingRoles, error: saveRolesError }] = API.useUsersUpdateRolesMutation()

    const { data, isLoading, isFetching } = API.useUsersGetListQuery({
        page,
        limit: LIMIT,
        search: debouncedSearch,
        roleIds: roleFilterIds.length > 0 ? roleFilterIds.join(',') : undefined,
        sortBy: sort.key as ApiType.Users.UsersSortBy,
        sortDir: sort.direction
    })

    // Calculate fixed table height
    useEffect(() => {
        const calculateTableHeight = () => {
            const containerHeight = document.documentElement.clientHeight
            const toolbarH = toolbarRef.current?.offsetHeight || 0
            const footerH = footerRef.current?.offsetHeight || 0
            const paginationH = paginationRef.current?.offsetHeight || 0

            setTableHeight(containerHeight - toolbarH - footerH - paginationH - 155)
        }

        calculateTableHeight()
        window.addEventListener('resize', calculateTableHeight)

        return () => window.removeEventListener('resize', calculateTableHeight)
    }, [data])

    // Reset to the first page whenever the (debounced) search term changes
    useEffect(() => {
        setPage(1)
    }, [debouncedSearch])

    // Sync all state → URL (shallow, no SSR re-fetch)
    useEffect(() => {
        const query: Record<string, string | number> = {}

        if (debouncedSearch) {
            query.search = debouncedSearch
        }
        if (roleFilterIds.length > 0) {
            query.roleIds = roleFilterIds.join(',')
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

        void router.push({ pathname: '/admin/users', query }, undefined, { shallow: true })
    }, [debouncedSearch, roleFilterIds, page, sort])

    const handleRoleFilterChange = useCallback((selected: Array<SelectOptionType<number>> | undefined) => {
        setRoleFilterIds(selected?.map(({ key }) => key) ?? [])
        setPage(1)
    }, [])

    const handleSort = useCallback((newSort: TableSortConfig<ApiModel.AdminUserItem>) => {
        setSort(newSort)
        setPage(1)
    }, [])

    const openEditRoles = useCallback((user: ApiModel.AdminUserItem) => {
        setSaveRolesAttempted(false)
        setEditRolesUser(user)
        setSelectedRoleIds(user.roles.map((role) => role.id))
    }, [])

    const closeEditRoles = useCallback(() => {
        setEditRolesUser(undefined)
        setSelectedRoleIds([])
    }, [])

    // The developer role (see server/app/Models/RolesModel::DEVELOPER_ROLE_ID)
    // is hardcoded to allow only a single holder at a time — disable the
    // checkbox once it's already assigned to someone other than the user
    // currently being edited, instead of only surfacing the API's rejection
    // after Save.
    const isDeveloperRoleTakenByOther = useCallback(
        (role: ApiModel.Role) =>
            role.id === DEVELOPER_ROLE_ID &&
            (role.usersCount ?? 0) > 0 &&
            !editRolesUser?.roles.some((r) => r.id === DEVELOPER_ROLE_ID),
        [editRolesUser]
    )

    const toggleRoleId = useCallback((roleId: number, checked: boolean) => {
        setSelectedRoleIds((current) => (checked ? [...current, roleId] : current.filter((id) => id !== roleId)))
    }, [])

    const handleSaveRoles = useCallback(async () => {
        if (!editRolesUser) {
            return
        }

        setSaveRolesAttempted(true)

        const result = await updateUserRoles({ id: editRolesUser.id, roleIds: selectedRoleIds })

        if ('error' in result) {
            return
        }

        closeEditRoles()
    }, [editRolesUser, selectedRoleIds, updateUserRoles, closeEditRoles])

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

                if (!item) {
                    return null
                }

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
            accessor: 'roles',
            header: t('users.columnRole', 'Роль'),
            formatter: (_data, row, i) => {
                const item = row[i]

                if (!item) {
                    return null
                }

                const badges =
                    item.roles.length > 0 ? (
                        item.roles.map((role) => (
                            <Badge
                                key={role.id}
                                label={role.name}
                                size={'small'}
                                className={styles.badgeDefault}
                            />
                        ))
                    ) : (
                        <Badge
                            label={t('users.roleUser', 'Пользователь')}
                            size={'small'}
                            className={styles.badgeDefault}
                        />
                    )

                // The edit tool is only rendered for someone holding
                // USERS_MANAGE — everyone else sees the same badges as plain,
                // non-interactive text (see `canManageRoles` above).
                if (!canManageRoles) {
                    return <div className={styles.rolesCellButton}>{badges}</div>
                }

                return (
                    <button
                        className={styles.rolesCellButton}
                        onClick={() => openEditRoles(item)}
                    >
                        {badges}
                    </button>
                )
            }
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
            accessor: 'pushEnabled',
            header: t('users.columnPush', 'Push'),
            formatter: (_data, row, i) => {
                const item = row[i]

                if (!item) {
                    return null
                }

                return item.pushEnabled ? (
                    <Badge
                        label={`${t('users.pushOn', 'Вкл')} (${item.pushSubscriptionCount})`}
                        size={'small'}
                        className={styles.badgeDefault}
                    />
                ) : (
                    <Badge
                        label={t('users.pushOff', 'Выкл')}
                        size={'small'}
                        className={styles.badgeMuted}
                    />
                )
            }
        },
        {
            accessor: 'age',
            header: t('users.columnAge', 'Пол / Возраст'),
            formatter: (_data, row, i) => {
                const item = row[i]

                return item ? sexAgeLabel(item) : '—'
            }
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
                        const item = row[i]

                        if (!item) {
                            return
                        }

                        setEventsUserId(item.id)
                        setEventsUserName(item.name)
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
            >
                <Input
                    clearable={true}
                    value={search}
                    placeholder={t('users.search', 'Поиск по имени')}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Select<number>
                    multiple={true}
                    closeOnSelect={true}
                    placeholder={t('users.filterByRole', 'Роль')}
                    value={roleFilterIds}
                    className={styles.selectFilter}
                    onSelect={handleRoleFilterChange}
                    options={(rolesData?.items ?? []).map((role) => ({
                        key: role.id,
                        value: role.name
                    }))}
                />
            </AppToolbar>

            <Container style={{ padding: '2px' }}>
                <Table<ApiModel.AdminUserItem>
                    className={styles.usersTable}
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

            <Container
                ref={paginationRef}
                className={styles.tableFooter}
            >
                <div className={styles.footerCount}>
                    {isFetching && <Spinner className={styles.loader} />}
                    {data?.count !== undefined &&
                        t('users.totalCount', 'Всего пользователей: {{count}}', { count: data.count })}
                </div>

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

            <UserEventsDialog
                userId={eventsUserId}
                userName={eventsUserName}
                onClose={() => {
                    setEventsUserId(undefined)
                    setEventsUserName(undefined)
                }}
            />

            {editRolesUser && (
                <Dialog
                    open={true}
                    title={t('users.editRolesTitle', 'Роли пользователя: {{name}}', { name: editRolesUser.name })}
                    onCloseDialog={closeEditRoles}
                >
                    {saveRolesAttempted && saveRolesError && (
                        <Message
                            type={'error'}
                            style={{ marginBottom: '10px' }}
                        >
                            {getErrorMessage(saveRolesError) ?? t('users.saveRolesError', 'Ошибка сохранения ролей')}
                        </Message>
                    )}

                    <div className={styles.rolesDialogList}>
                        {(rolesData?.items ?? []).map((role) => (
                            <Checkbox
                                key={role.id}
                                label={role.name}
                                checked={selectedRoleIds.includes(role.id)}
                                disabled={isDeveloperRoleTakenByOther(role)}
                                onChange={(e) => toggleRoleId(role.id, e.target.checked)}
                            />
                        ))}
                    </div>

                    <Button
                        mode={'primary'}
                        label={t('users.saveRoles', 'Сохранить')}
                        loading={isSavingRoles}
                        onClick={handleSaveRoles}
                    />
                </Dialog>
            )}

            <AppFooter ref={footerRef} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.USERS_MANAGE)

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default UsersPage
