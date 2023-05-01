import {
    useRelayGetListQuery,
    useRelayGetStateQuery,
    useRelayPutStatusMutation
} from '@/api/api'
import { useAppSelector } from '@/api/hooks'
import { IRelaySet } from '@/api/types'
import classNames from 'classnames'
import React from 'react'
import { Button, Dimmer, Loader, Message } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TRelayListItemProps = {
    index: number
    name: string
    status: boolean
    loading: boolean
    auth: boolean
    handleClick?: (data: IRelaySet) => void
}

const RelayListItem: React.FC<TRelayListItemProps> = (props) => {
    const { index, name, status, loading, auth, handleClick } = props
    const switchClass: string = status ? 'on' : 'off'

    return (
        <div className={styles.item}>
            <div className={styles.name}>
                <span className={styles[status ? 'ledOn' : 'ledOff']} />
                {name}
            </div>
            <Button
                loading={loading}
                className={styles[status ? 'switchOn' : 'switchOff']}
                disabled={loading || !auth}
                onClick={() =>
                    handleClick?.({ index: index, state: status ? 0 : 1 })
                }
                size={'mini'}
            >
                {switchClass}
            </Button>
        </div>
    )
}

const RelayList: React.FC = () => {
    const { data: relayList, isError, isLoading } = useRelayGetListQuery()
    const { data: relayState, isFetching: loaderState } = useRelayGetStateQuery(
        null,
        { pollingInterval: 15 * 1000 }
    )
    const [setRelayStatus, { isLoading: loaderSet }] =
        useRelayPutStatusMutation()

    const userAuth = useAppSelector((state) => state.auth.userAuth)

    return isLoading ? (
        <div className={classNames(styles.relayList, 'box', 'loader')}>
            <Dimmer active>
                <Loader />
            </Dimmer>
        </div>
    ) : isError || relayList === undefined || !relayList.items.length ? (
        <Message
            error
            content={'Возникла ошибка при получении списка управляемых реле'}
        />
    ) : (
        <div className={classNames(styles.relayList, 'box')}>
            {userAuth && relayState?.status === false && (
                <Dimmer active>
                    <Message
                        error
                        icon={'warning sign'}
                        header={'Ошибка получения состояния реле'}
                        content={
                            'Контроллер обсерватории не отвечает на запрос'
                        }
                    />
                </Dimmer>
            )}
            {relayList.items.map((item, key) => (
                <RelayListItem
                    key={key}
                    index={key}
                    name={item}
                    status={
                        relayState?.status === true
                            ? relayState?.payload[key]
                            : false
                    }
                    // loading={(!isSuccess && isFetching) ||
                    // (relayState?.status === true && typeof relayState?.payload[key] === 'undefined')}
                    loading={loaderState || loaderSet}
                    auth={userAuth && relayState?.status === true}
                    handleClick={async (relay) => await setRelayStatus(relay)}
                />
            ))}
        </div>
    )
}

export default RelayList
