import classNames from 'classnames'
import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import styles from './styles.module.sass'
import { TObject } from './types'

type TObjectCloudProps = {
    loader: boolean
    objects: TObject[]
    handleClick?: (ra: number, dec: number) => void
}

const ObjectCloudSkyMap: React.FC<TObjectCloudProps> = (props) => {
    const { loader, objects, handleClick } = props

    return (
        <div className={classNames(styles.objectCloudMap, 'box')}>
            {loader ? (
                <>
                    <Dimmer active>
                        <Loader />
                    </Dimmer>
                    <div>Загрузка...</div>
                </>
            ) : (
                objects.map((item, key) => (
                    <span
                        className={styles.item}
                        role={'button'}
                        tabIndex={0}
                        onKeyDown={() => {}}
                        onClick={() => handleClick?.(item.ra, item.dec)}
                        key={key}
                    >
                        {item.name.replace(/_/g, ' ')}
                    </span>
                ))
            )}
        </div>
    )
}

export default ObjectCloudSkyMap
