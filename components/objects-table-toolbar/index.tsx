import React, { useMemo } from 'react'
import { Dropdown, Input } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TToolbarProps = {
    search: string
    categories: string[]
    onChangeSearch: (search: string) => void
    onChangeCategories: (categories: any) => void
}

const ObjectsTableToolbar: React.FC<TToolbarProps> = (props) => {
    const { search, categories, onChangeSearch, onChangeCategories } = props

    const handleChange = ({
        target: { value }
    }: React.ChangeEvent<HTMLInputElement>) => onChangeSearch(value)

    const listCategoriesOptions = useMemo(
        () => categories.map((item) => ({ text: item, value: item })),
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
                    if (el.value) {
                        onChangeCategories(el.value)
                    }
                }}
            />
        </div>
    )
}

export default ObjectsTableToolbar
