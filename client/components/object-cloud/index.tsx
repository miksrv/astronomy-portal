import classNames from 'classnames'
import Link from 'next/link'
import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TObjectCloudProps = {
    loader: boolean
    current: string
    names: string[] | undefined
    link: string
}

const ObjectCloud: React.FC<TObjectCloudProps> = ({
    loader,
    current,
    names,
    link
}) => (
    <div className={classNames(styles.section, 'box')}>
        <Dimmer active={loader}>
            <Loader />
        </Dimmer>
        {names?.map((item) => (
            <>
                <Link
                    key={item}
                    href={`/${link}/${item}`}
                    className={current === item ? styles.active : undefined}
                    title={`${item.replace(
                        /_/g,
                        ' '
                    )} - Перейти к астрономическому объекту`}
                >
                    {item.replace(/_/g, ' ')}
                </Link>
                <span className={styles.divider}>•</span>
            </>
        ))}
    </div>
)

export default ObjectCloud
