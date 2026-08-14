import React, { useCallback, useMemo, useState } from 'react'
import {
    Badge,
    Button,
    Checkbox,
    Container,
    Dialog,
    Input,
    Message,
    Table,
    TableColumnProps
} from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { DEVELOPER_ROLE_ID } from '@/utils/constants'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

const RolesPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const pageTitle = t('pages.roles.title', 'Роли')

    const { data: rolesData, isLoading } = API.useRolesGetListQuery()
    const { data: permissionsData } = API.useRoleGetPermissionsQuery()

    const [createRole, { isLoading: isCreating, error: createError }] = API.useRoleCreateMutation()
    const [updateRole, { isLoading: isUpdating, error: updateError }] = API.useRoleUpdateMutation()
    const [deleteRole, { error: deleteError }] = API.useRoleDeleteMutation()

    const [editingRole, setEditingRole] = useState<ApiModel.Role | null | 'new'>(null)
    const [formName, setFormName] = useState('')
    const [formPermissions, setFormPermissions] = useState<ApiModel.Permission[]>([])
    const [deletingRole, setDeletingRole] = useState<ApiModel.Role | undefined>()

    // createError/updateError/deleteError persist on the RTK Query mutation
    // hooks until the next call — these flags gate display to only the save
    // attempt just made in the currently open dialog, so a failure doesn't
    // resurface as a stale error the next time an (unrelated) dialog opens.
    const [saveAttempted, setSaveAttempted] = useState(false)
    const [deleteAttempted, setDeleteAttempted] = useState(false)

    // USERS_MANAGE is hardcoded server-side to the single reserved developer
    // role (see server/app/Models/RolesModel::DEVELOPER_ROLE_ID) — the API
    // rejects granting/revoking it anywhere else, so it's not offered as a
    // checkbox except while editing that one role.
    const isEditingDeveloperRole = editingRole !== 'new' && editingRole?.id === DEVELOPER_ROLE_ID

    const editablePermissions = useMemo(
        () =>
            (permissionsData?.items ?? []).filter(
                (permission) => permission !== ApiModel.Permission.USERS_MANAGE || isEditingDeveloperRole
            ),
        [permissionsData, isEditingDeveloperRole]
    )

    const saveError = saveAttempted ? (createError ?? updateError) : undefined
    const displayedDeleteError = deleteAttempted ? deleteError : undefined

    const permissionLabel = useCallback(
        (permission: ApiModel.Permission): string => {
            const map: Record<ApiModel.Permission, string> = {
                [ApiModel.Permission.RELAY_CONTROL]: t('pages.roles.permission-relay-control', 'Управление реле'),
                [ApiModel.Permission.OBJECTS_MANAGE]: t(
                    'pages.roles.permission-objects-manage',
                    'Управление каталогом объектов'
                ),
                [ApiModel.Permission.PHOTOS_MANAGE]: t(
                    'pages.roles.permission-photos-manage',
                    'Управление архивом астрофото'
                ),
                [ApiModel.Permission.MAILINGS_MANAGE]: t(
                    'pages.roles.permission-mailings-manage',
                    'Управление рассылками'
                ),
                [ApiModel.Permission.USERS_MANAGE]: t(
                    'pages.roles.permission-users-manage',
                    'Управление пользователями и ролями'
                ),
                [ApiModel.Permission.COMMENTS_MODERATE]: t(
                    'pages.roles.permission-comments-moderate',
                    'Модерация комментариев'
                ),
                [ApiModel.Permission.EVENTS_CREATE]: t('pages.roles.permission-events-create', 'Создание астровыездов'),
                [ApiModel.Permission.EVENTS_UPDATE]: t(
                    'pages.roles.permission-events-update',
                    'Редактирование астровыездов'
                ),
                [ApiModel.Permission.EVENTS_DELETE]: t('pages.roles.permission-events-delete', 'Удаление астровыездов'),
                [ApiModel.Permission.EVENTS_GALLERY_UPLOAD]: t(
                    'pages.roles.permission-events-gallery-upload',
                    'Загрузка фото в галерею астровыезда'
                ),
                [ApiModel.Permission.EVENTS_CHECKIN]: t('pages.roles.permission-events-checkin', 'Проверка QR-кодов'),
                [ApiModel.Permission.EVENTS_STATISTIC]: t(
                    'pages.roles.permission-events-statistic',
                    'Статистика и регистрации на астровыезд'
                ),
                [ApiModel.Permission.EVENTS_REFUND]: t(
                    'pages.roles.permission-events-refund',
                    'Принудительный возврат оплаты'
                ),
                [ApiModel.Permission.EVENTS_USERS]: t(
                    'pages.roles.permission-events-users',
                    'Просмотр участников астровыезда'
                ),
                [ApiModel.Permission.PIPELINE_MANAGE]: t(
                    'pages.roles.permission-pipeline-manage',
                    'Управление pipeline обсерватории'
                )
            }

            return map[permission] ?? permission
        },
        [t]
    )

    const openCreate = useCallback(() => {
        setSaveAttempted(false)
        setEditingRole('new')
        setFormName('')
        setFormPermissions([])
    }, [])

    const openEdit = useCallback((role: ApiModel.Role) => {
        setSaveAttempted(false)
        setEditingRole(role)
        setFormName(role.name)
        setFormPermissions(role.permissions)
    }, [])

    const closeForm = useCallback(() => {
        setEditingRole(null)
    }, [])

    const togglePermission = useCallback(
        (permission: ApiModel.Permission, checked: boolean) => {
            // The developer role must always keep USERS_MANAGE — the API
            // rejects stripping it, so don't let the checkbox pretend it can be.
            if (permission === ApiModel.Permission.USERS_MANAGE && isEditingDeveloperRole && !checked) {
                return
            }

            setFormPermissions((current) =>
                checked ? [...current, permission] : current.filter((item) => item !== permission)
            )
        },
        [isEditingDeveloperRole]
    )

    const handleSave = useCallback(async () => {
        if (!formName.trim()) {
            return
        }

        setSaveAttempted(true)

        const result =
            editingRole === 'new'
                ? await createRole({ name: formName, permissions: formPermissions })
                : editingRole
                  ? await updateRole({ id: editingRole.id, name: formName, permissions: formPermissions })
                  : undefined

        if (result && 'error' in result) {
            return
        }

        closeForm()
    }, [editingRole, formName, formPermissions, createRole, updateRole, closeForm])

    const handleConfirmDelete = useCallback(async () => {
        if (!deletingRole) {
            return
        }

        setDeleteAttempted(true)

        const result = await deleteRole(deletingRole.id)

        if ('error' in result) {
            return
        }

        setDeletingRole(undefined)
    }, [deletingRole, deleteRole])

    const tableColumns: Array<TableColumnProps<ApiModel.Role>> = [
        {
            accessor: 'name',
            header: t('pages.roles.column-name', 'Название'),
            formatter: (_data, row, i) => (
                <button
                    className={styles.roleNameButton}
                    onClick={() => openEdit(row[i])}
                >
                    {row[i].name}
                </button>
            )
        },
        {
            accessor: 'permissions',
            header: t('pages.roles.column-permissions', 'Привилегии'),
            formatter: (_data, row, i) => (
                <div className={styles.permissionsCell}>
                    {row[i].permissions.map((permission) => (
                        <Badge
                            key={permission}
                            label={permissionLabel(permission)}
                            size={'small'}
                            className={styles.badgeDefault}
                        />
                    ))}
                </div>
            )
        },
        {
            accessor: 'usersCount',
            header: t('pages.roles.column-users-count', 'Пользователей'),
            formatter: (data) => (data as number) ?? 0
        },
        {
            accessor: 'id',
            header: '',
            formatter: (_data, row, i) => (
                <Button
                    size={'small'}
                    mode={'secondary'}
                    variant={'negative'}
                    icon={'Close'}
                    onClick={() => {
                        setDeleteAttempted(false)
                        setDeletingRole(row[i])
                    }}
                />
            )
        }
    ]

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
            >
                <Button
                    icon={'PlusCircle'}
                    mode={'secondary'}
                    label={t('pages.roles.create-button', 'Добавить роль')}
                    onClick={openCreate}
                />
            </AppToolbar>

            <Container style={{ padding: '2px' }}>
                <Table<ApiModel.Role>
                    data={rolesData?.items || []}
                    columns={tableColumns}
                    loading={isLoading}
                    noDataCaption={t('pages.roles.no-roles', 'Ролей ещё нет')}
                />
            </Container>

            {editingRole != null && (
                <Dialog
                    open={true}
                    title={
                        editingRole === 'new'
                            ? t('pages.roles.create-title', 'Новая роль')
                            : t('pages.roles.edit-title', 'Редактирование роли')
                    }
                    onCloseDialog={closeForm}
                >
                    {saveError && (
                        <Message
                            type={'error'}
                            style={{ marginBottom: '10px' }}
                        >
                            {getErrorMessage(saveError) ?? t('pages.roles.save-error', 'Ошибка сохранения')}
                        </Message>
                    )}

                    <Input
                        label={t('pages.roles.field-name', 'Название')}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={styles.formElement}
                    />

                    <div className={styles.permissionsList}>
                        {editablePermissions.map((permission) => (
                            <Checkbox
                                key={permission}
                                label={permissionLabel(permission)}
                                checked={formPermissions.includes(permission)}
                                disabled={permission === ApiModel.Permission.USERS_MANAGE && isEditingDeveloperRole}
                                onChange={(e) => togglePermission(permission, e.target.checked)}
                            />
                        ))}
                    </div>

                    <Button
                        mode={'primary'}
                        label={t('pages.roles.save-button', 'Сохранить')}
                        loading={isCreating || isUpdating}
                        disabled={!formName.trim()}
                        onClick={handleSave}
                    />
                </Dialog>
            )}

            {deletingRole && (
                <Dialog
                    open={true}
                    title={t('pages.roles.delete-title', 'Удалить роль?')}
                    onCloseDialog={() => setDeletingRole(undefined)}
                >
                    {displayedDeleteError && (
                        <Message
                            type={'error'}
                            style={{ marginBottom: '10px' }}
                        >
                            {getErrorMessage(displayedDeleteError) ?? t('pages.roles.delete-error', 'Ошибка удаления')}
                        </Message>
                    )}

                    <p>
                        {(deletingRole.usersCount ?? 0) > 0
                            ? t(
                                  'pages.roles.delete-warning-with-users',
                                  'Роль «{{name}}» назначена {{count}} пользователям — после удаления они её лишатся.',
                                  { name: deletingRole.name, count: deletingRole.usersCount }
                              )
                            : t('pages.roles.delete-warning', 'Удалить роль «{{name}}»?', { name: deletingRole.name })}
                    </p>

                    <Button
                        mode={'primary'}
                        variant={'negative'}
                        label={t('common.delete', 'Удалить')}
                        onClick={handleConfirmDelete}
                    />
                </Dialog>
            )}

            <AppFooter />
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

export default RolesPage
