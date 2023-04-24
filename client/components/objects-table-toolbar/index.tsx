import { useAppSelector } from '@/api/hooks'
import { TCategory } from '@/api/types'
import React, { useMemo } from 'react'
import { Button, Dropdown, Icon, Input } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TToolbarProps = {
    search: string
    categories?: TCategory[]
    onAddCatalog?: () => void
    onChangeSearch: (search: string) => void
    onChangeCategories: (id: number[]) => void
}

const ObjectsTableToolbar: React.FC<TToolbarProps> = (props) => {
    const {
        search,
        categories,
        onAddCatalog,
        onChangeSearch,
        onChangeCategories
    } = props

    const userAuth = useAppSelector((state) => state.auth.userAuth)

    const handleChange = ({
        target: { value }
    }: React.ChangeEvent<HTMLInputElement>) => onChangeSearch(value)

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
                onChange={(target, el) => {
                    onChangeCategories(el.value as number[])
                }}
            />
            {userAuth && (
                <Button
                    icon={true}
                    className={styles.addButton}
                    size={'mini'}
                    color={'yellow'}
                    labelPosition={'left'}
                    onClick={onAddCatalog}
                >
                    <Icon name={'plus'} />
                    Добавить
                </Button>
            )}
        </div>
    )
}

export default ObjectsTableToolbar
