'use client'

import { ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { openFormCatalog, openFormPhoto } from '@/api/applicationSlice'
import { usePathname } from 'next/navigation'
import React, { useMemo } from 'react'
import { Button, Dropdown, Icon, Input } from 'semantic-ui-react'

import styles from './styles.module.sass'

interface CatalogToolbarProps {
    search: string
    categories?: ApiModel.Category[]
    onChangeSearch?: (search: string) => void
    onChangeCategories?: (id: number[]) => void
}

const CatalogToolbar: React.FC<CatalogToolbarProps> = (props) => {
    const { search, categories, onChangeSearch, onChangeCategories } = props

    const pathname = usePathname()
    const dispatch = useAppDispatch()
    const user = useAppSelector((state) => state.auth.user)

    const handleChange = ({
        target: { value }
    }: React.ChangeEvent<HTMLInputElement>) => onChangeSearch?.(value)

    const listCategoriesOptions = useMemo(
        () =>
            categories?.map((item) => ({ text: item.name, value: item.id })) ||
            [],
        [categories]
    )

    const handleAddButton = () => {
        if (pathname === '/photos') {
            dispatch(openFormPhoto(true))
        } else {
            dispatch(openFormCatalog(true))
        }
    }

    return (
        <div className={styles.objectsToolbar}>
            <Input
                icon={'search'}
                placeholder={'Поиск...'}
                value={search}
                className={styles.search}
                onChange={handleChange}
            />
            <Dropdown
                placeholder={'Категории объектов'}
                multiple
                search
                selection
                clearable
                fluid
                className={styles.categoryDropdown}
                options={listCategoriesOptions}
                onChange={(_, el) => {
                    onChangeCategories?.(el.value as number[])
                }}
            />
            {user?.role === 'admin' && (
                <Button
                    icon={true}
                    className={styles.addButton}
                    size={'mini'}
                    color={'yellow'}
                    labelPosition={'left'}
                    onClick={handleAddButton}
                >
                    <Icon name={'plus'} />
                    {'Добавить'}
                </Button>
            )}
        </div>
    )
}

export default CatalogToolbar
