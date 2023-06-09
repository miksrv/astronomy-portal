import { TCategory } from '@/api/types'
import React from 'react'
import { Button } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TPhotoCategorySwitcherProps = {
    active: number
    categories?: TCategory[]
    onSelectCategory: (id: number) => void
}

const PhotoCategorySwitcher: React.FC<TPhotoCategorySwitcherProps> = ({
    active,
    categories,
    onSelectCategory
}) => {
    const defaultCategory: TCategory = { id: 0, name: '' }

    return (
        <div className={styles.categoryToolbar}>
            {categories &&
                [defaultCategory, ...categories]
                    .filter(
                        ({ id, object_count }) => !!object_count || id === 0
                    )
                    .map(({ id, name }) => (
                        <Button
                            color={active === id ? 'orange' : 'yellow'}
                            size={'mini'}
                            key={id}
                            onClick={() => onSelectCategory?.(id)}
                        >
                            {name === '' ? 'Все объекты' : name}
                        </Button>
                    ))}
        </div>
    )
}

export default PhotoCategorySwitcher
