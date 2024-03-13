import classNames from 'classnames'
import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import styles from './styles.module.sass'
import { TObject } from './types'

interface ObjectCloudSkyMapProps {
    loading: boolean
    objects?: TObject[]
    handleClick?: (ra: number, dec: number) => void
}

const ObjectCloudSkyMap: React.FC<ObjectCloudSkyMapProps> = ({
    loading,
    objects,
    handleClick
}) => (
    <div className={classNames(styles.section, 'box')}>
        <Dimmer active={loading}>
            <Loader />
        </Dimmer>
        {objects
            ?.sort((a, b) => (a.name! > b.name! ? 1 : -1))
            .map((item) => (
                <span key={item.name}>
                    <span
                        className={styles.item}
                        role={'button'}
                        tabIndex={0}
                        onKeyDown={() => {}}
                        onClick={() => handleClick?.(item.ra!, item.dec!)}
                    >
                        {item.name?.replace(/_/g, ' ')}
                    </span>
                    <span className={styles.divider}>•</span>
                </span>
            ))}
    </div>
)

export default ObjectCloudSkyMap
