import React, { useEffect, useRef, useState } from 'react'
import { Button, cn, Container, Message, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'

import { API, ApiModel, ApiType, useAppDispatch, useAppSelector } from '@/api'

import styles from './styles.module.sass'

/**
 * TODO useState
 *
 * Нужно создать массив состояний реле через useState и каждый раз при изменении состояния реле
 * изменять это состояние в массиве, чтобы каждый раз не перезапрашивать список реле с состояниями
 */
export const RelayList: React.FC = () => {
    const { t } = useTranslation()

    const [relayLoading, setRelayLoading] = React.useState<number>()
    const [countdownTimer, setCountdownTimer] = useState<number>(0)
    const countdownTimerRef = useRef<number>(0)
    // Pause polling when the tab is not visible to avoid wasted network requests
    const [pollingInterval, setPollingInterval] = useState<number>(
        typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 0 : 15 * 1000
    )

    const { data: relayList, isLoading, isError } = API.useRelayGetStateQuery(undefined, { pollingInterval })

    useEffect(() => {
        const handleVisibilityChange = () => {
            setPollingInterval(document.visibilityState === 'hidden' ? 0 : 15 * 1000)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    const dispatch = useAppDispatch()

    const [setRelayStatus, { isLoading: loaderSet, data: relaySet }] = API.useRelayPutStatusMutation()

    const [setLightOn, { isLoading: lightLoading }] = API.useRelayToggleLightMutation()

    const user = useAppSelector((state) => state.auth.user)

    const handleSetRelay = async (relay: ApiType.Relay.ReqRelaySet) => {
        setRelayLoading(relay.id)

        // Optimistically update the relay state before the server confirms
        const patchResult = dispatch(
            API.util.updateQueryData('relayGetState', undefined, (draft) => {
                if (draft?.items) {
                    const item = draft.items.find((r) => r.id === relay.id)

                    if (item) {
                        item.state = relay.state
                    }
                }
            })
        )

        try {
            await setRelayStatus(relay)
        } catch {
            // Revert optimistic update if the request fails
            patchResult.undo()
        }
    }

    const tick = () => {
        if (countdownTimerRef.current > 0) {
            countdownTimerRef.current -= 1
            setCountdownTimer(countdownTimerRef.current)
        }
    }

    useEffect(() => {
        if (relayList?.light?.cooldown) {
            countdownTimerRef.current = relayList.light.cooldown
            setCountdownTimer(relayList.light.cooldown)
        }
    }, [relayList])

    useEffect(() => {
        const timer = setInterval(() => tick(), 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <Container className={styles.relayListContainer}>
            {isLoading && (
                <div className={styles.loader}>
                    <Spinner />
                </div>
            )}

            {isError && (
                <Message type={'error'}>
                    {t('components.pages.observatory.relay-list.error', 'Ошибка при получении списка реле')}
                </Message>
            )}

            <>
                {relayList?.items.map((item) => (
                    <RelayListItem
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        state={item.state === 1 || (relaySet?.state === 1 && relaySet?.id === item.id)}
                        loading={loaderSet && relayLoading === item.id}
                        isAdmin={user?.role === ApiModel.UserRole.ADMIN}
                        handleClick={async (relay) => await handleSetRelay(relay)}
                    />
                ))}

                {!!relayList?.items?.length && (
                    <div className={styles.item}>
                        <div className={styles.name}>
                            <span
                                className={cn(
                                    styles.ledIndicator,
                                    relayList?.items?.[1]?.state ? styles.on : styles.off
                                )}
                            />
                            {t('components.pages.observatory.relay-list.lightning', 'Освещение')}
                        </div>
                        <div className={styles.description}>
                            {countdownTimer > 0 ? (
                                <>
                                    {t('components.pages.observatory.relay-list.available-in', 'Доступно через')}{' '}
                                    <b>{countdownTimer}</b> {t('components.pages.observatory.relay-list.sec', 'секунд')}
                                </>
                            ) : (
                                <>
                                    {t('components.pages.observatory.relay-list.turned-on', 'Включили')}{' '}
                                    {t('components.pages.observatory.relay-list.times', '{{count}} раз', {
                                        count: relayList?.light.counter
                                    })}
                                </>
                            )}
                        </div>
                        <Button
                            size={'small'}
                            loading={(isLoading && relayLoading === 1) || lightLoading}
                            className={cn(styles.switchButton, relayList?.items?.[1]?.state ? styles.on : styles.off)}
                            disabled={
                                loaderSet ||
                                lightLoading ||
                                relayLoading === 1 ||
                                !relayList?.light.enable ||
                                countdownTimer > 0 ||
                                relayList?.items?.[1]?.state === 1
                            }
                            onClick={async () => {
                                if (countdownTimer === 0) {
                                    await setLightOn()
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

interface RelayListItemProps {
    id: number
    name: string
    state: boolean
    loading: boolean
    isAdmin?: boolean
    handleClick?: (relay: ApiType.Relay.ReqRelaySet) => void
}

export const RelayListItem: React.FC<RelayListItemProps> = ({ id, name, state, loading, isAdmin, handleClick }) => (
    <div className={styles.item}>
        <div className={styles.name}>
            <span className={cn(styles.ledIndicator, state ? styles.on : styles.off)} />
            {name}
        </div>
        <Button
            loading={loading}
            className={cn(styles.switchButton, state ? styles.on : styles.off)}
            disabled={loading || !isAdmin}
            onClick={() => handleClick?.({ id, state: state ? 0 : 1 })}
        >
            {!loading ? (state ? 'on' : 'off') : ''}
        </Button>
    </div>
)
