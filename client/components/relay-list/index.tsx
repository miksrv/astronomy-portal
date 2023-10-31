import {
    useRelayGetLightMutation,
    useRelayGetStateQuery,
    useRelayPutStatusMutation
} from '@/api/api'
import { useAppSelector } from '@/api/hooks'
import { APIRequestRelaySet } from '@/api/types'
import { declOfNum } from '@/functions/helpers'
import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import { Button, Dimmer, Loader, Message } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TRelayListItemProps = {
    id: number
    name: string
    state: boolean
    loading: boolean
    isAuth?: boolean
    handleClick?: (relay: APIRequestRelaySet) => void
}

const RelayListItem: React.FC<TRelayListItemProps> = ({
    id,
    name,
    state,
    loading,
    isAuth,
    handleClick
}) => (
    <div className={styles.item}>
        <div className={styles.name}>
            <span className={styles[state ? 'ledOn' : 'ledOff']} />
            {name}
        </div>
        <Button
            loading={loading}
            className={styles[state ? 'switchOn' : 'switchOff']}
            disabled={loading || !isAuth}
            onClick={() => handleClick?.({ id, state: state ? 0 : 1 })}
            size={'mini'}
        >
            {state ? 'on' : 'off'}
        </Button>
    </div>
)

/**
 * #TODO useState
 *
 * Нужно создать массив состояний реле через useState и каждый раз при изменении состояния реле
 * изменять это состояние в массиве, чтобы каждый раз не перезапрашивать список реле с состояниями
 */
const RelayList: React.FC = () => {
    const [relayLoading, setRelayLoading] = React.useState<number>()
    const [countdownTimer, setCountdownTimer] = useState<number>(0)

    const {
        data: relayList,
        isLoading,
        isError
    } = useRelayGetStateQuery(null, { pollingInterval: 15 * 1000 })

    const [setRelayStatus, { isLoading: loaderSet, data: relaySet }] =
        useRelayPutStatusMutation()

    const [setLightOn, { isLoading: lightLoading }] = useRelayGetLightMutation()

    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const handleSetRelay = async (relay: APIRequestRelaySet) => {
        setRelayLoading(relay.id)
        await setRelayStatus(relay)
    }

    const tick = () => {
        if (countdownTimer > 0) {
            setCountdownTimer(countdownTimer - 1)
        }
    }

    useEffect(() => {
        if (relayList?.light?.cooldown) {
            setCountdownTimer(relayList.light.cooldown)
        }
    }, [relayList])

    useEffect(() => {
        const timer = setInterval(() => tick(), 1000)

        return () => clearInterval(timer)
    })

    return isLoading ? (
        <div className={classNames(styles.relayList, styles.loader, 'box')}>
            <Dimmer active>
                <Loader />
            </Dimmer>
        </div>
    ) : isError || !relayList?.items.length ? (
        <div className={classNames(styles.relayList, styles.loader, 'box')}>
            <Dimmer active>
                <Message
                    error
                    content={'Ошибка при получении списка реле'}
                />
            </Dimmer>
        </div>
    ) : (
        <div className={classNames(styles.relayList, 'box')}>
            {isAuth && isError && (
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
                    isAuth={isAuth}
                    handleClick={async (relay) => await handleSetRelay(relay)}
                />
            ))}

            <div className={styles.item}>
                <div className={styles.name}>
                    <span
                        className={
                            styles[
                                relayList?.items?.[1]?.state
                                    ? 'ledOn'
                                    : 'ledOff'
                            ]
                        }
                    />
                    {'ОСВЕЩЕНИЕ'}
                </div>
                <div className={styles.description}>
                    {countdownTimer > 0 ? (
                        <>
                            {'Доступно через'} <b>{countdownTimer}</b> {'сек'}
                        </>
                    ) : (
                        <>
                            {'Включили'} <b>{relayList?.light.counter}</b>{' '}
                            {declOfNum(relayList?.light.counter || 0, [
                                'раз',
                                'раза',
                                'раз'
                            ])}
                        </>
                    )}
                </div>
                <Button
                    loading={(isLoading && relayLoading === 1) || lightLoading}
                    className={
                        styles[
                            relayList?.items?.[1]?.state
                                ? 'switchOn'
                                : 'switchOff'
                        ]
                    }
                    disabled={
                        loaderSet ||
                        lightLoading ||
                        relayLoading === 1 ||
                        !relayList.light.enable ||
                        countdownTimer > 0 ||
                        relayList?.items?.[1]?.state === 1
                    }
                    onClick={() => {
                        if (countdownTimer === 0) {
                            setLightOn()
                        }
                    }}
                    size={'mini'}
                >
                    {relayList?.items?.[1]?.state ? 'on' : 'off'}
                </Button>
            </div>
        </div>
    )
}

export default RelayList
