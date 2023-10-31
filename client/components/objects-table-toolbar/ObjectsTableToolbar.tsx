import { openFormCatalog } from '@/api/applicationSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { TCategory } from '@/api/types'
import React, { useMemo } from 'react'
import { Button, Dropdown, Icon, Input } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TToolbarProps = {
    search: string
    categories?: TCategory[]
    onChangeSearch?: (search: string) => void
    onChangeCategories?: (id: number[]) => void
}

const ObjectsTableToolbar: React.FC<TToolbarProps> = (props) => {
    const { search, categories, onChangeSearch, onChangeCategories } = props

    const dispatch = useAppDispatch()
    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const handleChange = ({
        target: { value }
    }: React.ChangeEvent<HTMLInputElement>) => onChangeSearch?.(value)

    const listCategoriesOptions = useMemo(
        () =>
            categories?.map((item) => ({ text: item.name, value: item.id })) ||
            [],
        [categories]
    )

    return (
        <div className={styles.objectsToolbar}>
            <Input
                value={search}
                onChange={handleChange}
                icon={'search'}
                className={styles.search}
                placeholder={'Поиск...'}
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
            {isAuth && (
                <Button
                    icon={true}
                    className={styles.addButton}
                    size={'mini'}
                    color={'yellow'}
                    labelPosition={'left'}
                    onClick={() => dispatch(openFormCatalog(true))}
                >
                    <Icon name={'plus'} />
                    {'Добавить'}
                </Button>
            )}
        </div>
    )
}

export default ObjectsTableToolbar
