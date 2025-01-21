import { API, ApiType, useAppSelector } from '@/api'
import { declOfNum } from '@/functions/helpers'
import React, { useEffect, useState } from 'react'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface RelayListItemProps {
    id: number
    name: string
    state: boolean
    loading: boolean
    isAdmin?: boolean
    handleClick?: (relay: ApiType.Relay.ReqRelaySet) => void
}

export const RelayListItem: React.FC<RelayListItemProps> = ({
    id,
    name,
    state,
    loading,
    isAdmin,
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
            disabled={loading || !isAdmin}
            onClick={() => handleClick?.({ id, state: state ? 0 : 1 })}
        >
            {!loading ? (state ? 'on' : 'off') : ''}
        </Button>
    </div>
)

/**
 * TODO useState
 *
 * Нужно создать массив состояний реле через useState и каждый раз при изменении состояния реле
 * изменять это состояние в массиве, чтобы каждый раз не перезапрашивать список реле с состояниями
 */
export const RelayList: React.FC = () => {
    const [relayLoading, setRelayLoading] = React.useState<number>()
    const [countdownTimer, setCountdownTimer] = useState<number>(0)

    const {
        data: relayList,
        isLoading,
        isError
    } = API.useRelayGetStateQuery(null, { pollingInterval: 15 * 1000 })

    const [setRelayStatus, { isLoading: loaderSet, data: relaySet }] =
        API.useRelayPutStatusMutation()

    const [setLightOn, { isLoading: lightLoading }] =
        API.useRelayGetLightMutation()

    const user = useAppSelector((state) => state.auth.user)

    const handleSetRelay = async (relay: ApiType.Relay.ReqRelaySet) => {
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

    return (
        <Container className={styles.relayListContainer}>
            {isLoading && (
                <div className={styles.loader}>
                    <Spinner className={styles.spinner} />
                </div>
            )}

            {isError && (
                <Message type={'error'}>
                    {'Ошибка при получении списка реле'}
                </Message>
            )}

            <>
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
                        isAdmin={user?.role === 'admin'}
                        handleClick={async (relay) =>
                            await handleSetRelay(relay)
                        }
                    />
                ))}

                {!!relayList?.items?.length && (
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
                                    {'Доступно через'} <b>{countdownTimer}</b>{' '}
                                    {'сек'}
                                </>
                            ) : (
                                <>
                                    {'Включили'}{' '}
                                    <b>{relayList?.light.counter}</b>{' '}
                                    {declOfNum(relayList?.light.counter || 0, [
                                        'раз',
                                        'раза',
                                        'раз'
                                    ])}
                                </>
                            )}
                        </div>
                        <Button
                            size={'small'}
                            loading={
                                (isLoading && relayLoading === 1) ||
                                lightLoading
                            }
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
                                !relayList?.light.enable ||
                                countdownTimer > 0 ||
                                relayList?.items?.[1]?.state === 1
                            }
                            onClick={() => {
                                if (countdownTimer === 0) {
                                    setLightOn()
                                }
                            }}
                        >
                            {!(isLoading && relayLoading === 1) && !lightLoading
                                ? relayList?.items?.[1]?.state
                                    ? 'on'
                                    : 'off'
                                : ''}
                        </Button>
                    </div>
                )}
            </>
        </Container>
    )
}

export default RelayList
