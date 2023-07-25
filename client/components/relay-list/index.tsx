import { useRelayGetStateQuery, useRelayPutStatusMutation } from '@/api/api'
import { useAppSelector } from '@/api/hooks'
import { APIRequestRelaySet } from '@/api/types'
import classNames from 'classnames'
import React from 'react'
import { Button, Dimmer, Loader, Message } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TRelayListItemProps = {
    id: number
    name: string
    state: boolean
    loading: boolean
    auth: boolean
    handleClick?: (relay: APIRequestRelaySet) => void
}

const RelayListItem: React.FC<TRelayListItemProps> = (props) => {
    const { id, name, state, loading, auth, handleClick } = props

    return (
        <div className={styles.item}>
            <div className={styles.name}>
                <span className={styles[state ? 'ledOn' : 'ledOff']} />
                {name}
            </div>
            <Button
                loading={loading}
                className={styles[state ? 'switchOn' : 'switchOff']}
                disabled={loading || !auth}
                onClick={() => handleClick?.({ id, state: state ? 0 : 1 })}
                size={'mini'}
            >
                {state ? 'on' : 'off'}
            </Button>
        </div>
    )
}

/**
 * #TODO useState
 *
 * Нужно создать массив состояний реле через useState и каждый раз при изменении состояния реле
 * изменять это состояние в массиве, чтобы каждый раз не перезапрашивать список реле с состояниями
 */
const RelayList: React.FC = () => {
    const [relayLoading, setRelayLoading] = React.useState<number>()

    const {
        data: relayList,
        isLoading,
        isError
    } = useRelayGetStateQuery(null, { pollingInterval: 15 * 1000 })

    const [setRelayStatus, { isLoading: loaderSet, data: relaySet }] =
        useRelayPutStatusMutation()

    const userAuth = useAppSelector((state) => state.auth.userAuth)

    const handleSetRelay = async (relay: APIRequestRelaySet) => {
        setRelayLoading(relay.id)
        await setRelayStatus(relay)
    }

    return isLoading ? (
        <div className={classNames(styles.relayList, styles.loader, 'box')}>
            <Dimmer active>
                <Loader />
            </Dimmer>
        </div>
    ) : isError || !relayList?.items.length ? (
        <Message
            error
            content={'Возникла ошибка при получении списка управляемых реле'}
        />
    ) : (
        <div className={classNames(styles.relayList, 'box')}>
            {userAuth && isError && (
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
            {relayList?.items.map((item) => (
                <RelayListItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    state={
                        item.state === 1 ||
                        (relaySet?.state === 1 && relaySet?.id === item.id)
                    }
                    loading={loaderSet && relayLoading === item.id}
                    auth={userAuth}
                    handleClick={async (relay) => await handleSetRelay(relay)}
                />
            ))}
        </div>
    )
}

export default RelayList
