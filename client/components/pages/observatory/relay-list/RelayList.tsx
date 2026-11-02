import React, { startTransition, useEffect, useOptimistic, useRef, useState } from 'react'
import { Button, cn, Container, Icon, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType, useAppDispatch, useAppSelector } from '@/api'
import { CardMeta, CardTitle, Switch } from '@/components/ui'
import { useInView } from '@/hooks/useInView'
import { hasPermission } from '@/utils/permissions'

import { LIGHT_RELAY_ID, RELAY_POLLING_MS, RELAYS } from './constants'

import styles from './styles.module.sass'

/**
 * The observatory's power relays: every device with its switch (privileged users only) and
 * the light anyone can turn on for a moment to see the observatory on the camera. The list of
 * devices is fixed hardware and renders at once; only the states come from the API.
 */
export const RelayList: React.FC = () => {
    const { t } = useTranslation()

    const [relayLoading, setRelayLoading] = useState<number>()
    const [countdownTimer, setCountdownTimer] = useState<number>(0)
    const [lightError, setLightError] = useState(false)
    const countdownTimerRef = useRef<number>(0)

    // The relay board answers slowly: ask it only once the card is near the viewport, so the
    // weather above isn't queued behind it. Polling pauses while the tab is hidden
    const cardRef = useRef<HTMLElement>(null)
    const inView = useInView(cardRef)

    const {
        data: relayList,
        isLoading,
        isError
    } = API.useRelayGetStateQuery(undefined, {
        skip: !inView,
        pollingInterval: RELAY_POLLING_MS,
        skipPollingIfUnfocused: true
    })

    const dispatch = useAppDispatch()

    const [setRelayStatus, { isLoading: loaderSet }] = API.useRelayPutStatusMutation()

    const [setLightOn, { isLoading: lightLoading }] = API.useRelayToggleLightMutation()

    const states = new Map(relayList?.items.map(({ id, state }) => [id, state === 1]))

    // Instant feedback on click instead of waiting out the round-trip - reverts
    // on its own once the transition below settles (see handleLightClick).
    const [optimisticLightOn, setOptimisticLightOn] = useOptimistic(states.get(LIGHT_RELAY_ID) ?? false)

    const user = useAppSelector((state) => state.auth.user)

    const handleSetRelay = async (relay: ApiType.Relay.ReqRelaySet) => {
        setRelayLoading(relay.id)

        // Optimistically update the relay state before the server confirms
        const patchResult = dispatch(
            API.util.updateQueryData('relayGetState', undefined, (draft) => {
                const item = draft?.items?.find((r) => r.id === relay.id)

                if (item) {
                    item.state = relay.state
                }
            })
        )

        try {
            // `.unwrap()` throws on a failed request; the bare trigger resolves with `{ error }`
            await setRelayStatus(relay).unwrap()
        } catch {
            // Revert optimistic update if the request fails
            patchResult.undo()
        } finally {
            setRelayLoading(undefined)
        }
    }

    const handleLightClick = () => {
        if (countdownTimer !== 0) {
            return
        }

        startTransition(async () => {
            setOptimisticLightOn(true)
            setLightError(false)

            try {
                // `.unwrap()` throws on a failed request (the route is rate-limited, the board
                // may be down); the bare trigger would resolve with `{ error }` and show nothing
                await setLightOn().unwrap()

                // `relayToggleLight` invalidates the Relay tag, but that background
                // refetch isn't awaited by the mutation trigger itself - force and
                // await it explicitly so this transition (and the optimistic value
                // with it) doesn't end before `relayGetState` actually reflects the
                // new state, which would otherwise flash the button back to "off"
                // for a moment.
                await dispatch(API.endpoints.relayGetState.initiate(undefined, { forceRefetch: true })).unwrap()
            } catch {
                setLightError(true)
            }
        })
    }

    useEffect(() => {
        if (relayList?.light?.cooldown) {
            countdownTimerRef.current = relayList.light.cooldown
            setCountdownTimer(relayList.light.cooldown)
        }
    }, [relayList])

    useEffect(() => {
        const timer = setInterval(() => {
            if (countdownTimerRef.current > 0) {
                countdownTimerRef.current -= 1
                setCountdownTimer(countdownTimerRef.current)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const canControl = hasPermission(user, ApiModel.Permission.RELAY_CONTROL)
    const switchedOn = [...states.values()].filter(Boolean).length

    const relayTitles: Record<number, string> = {
        0: t('components.pages.observatory.relay-list.mount', 'Монтировка'),
        1: t('components.pages.observatory.relay-list.camera', 'Камера'),
        2: t('components.pages.observatory.relay-list.focuser', 'Фокусер'),
        3: t('components.pages.observatory.relay-list.heaters', 'Контроллер грелок'),
        6: t('components.pages.observatory.relay-list.power-supply', 'Блок питания 12 В'),
        7: t('components.pages.observatory.relay-list.flat-panel', 'LED Flat-панель')
    }

    return (
        <Container
            ref={cardRef}
            className={styles.relayList}
            header={
                <CardTitle icon={'Lightning'}>
                    {t('components.pages.observatory.relay-list.title', 'Питание оборудования')}
                </CardTitle>
            }
            action={
                relayList && (
                    <CardMeta>
                        {t('components.pages.observatory.relay-list.summary', 'включено {{on}} из {{total}}', {
                            on: switchedOn,
                            total: RELAYS.length
                        })}
                    </CardMeta>
                )
            }
        >
            {isError && (
                <Message type={'error'}>
                    {t('components.pages.observatory.relay-list.error', 'Ошибка при получении списка реле')}
                </Message>
            )}

            {lightError && (
                <Message type={'error'}>
                    {t(
                        'components.pages.observatory.relay-list.light-error',
                        'Не удалось включить освещение, попробуйте через минуту'
                    )}
                </Message>
            )}

            <ul className={styles.relays}>
                {RELAYS.map(({ id, model, icon }) => {
                    const name = `${relayTitles[id] ?? ''}${model ? ` (${model})` : ''}`
                    const on = states.get(id) ?? false

                    return (
                        <li
                            key={id}
                            className={cn(styles.relay, on && styles.on)}
                        >
                            <span
                                className={styles.relayIcon}
                                aria-hidden={'true'}
                            >
                                <Icon name={icon} />
                            </span>
                            <span className={styles.relayName}>
                                {relayTitles[id]}
                                {model && <small>{model}</small>}
                            </span>
                            <Switch
                                checked={on}
                                aria-label={name}
                                // The states are unknown until the first poll: the switches wait, greyed
                                loading={!inView || isLoading || (loaderSet && relayLoading === id)}
                                // One request at a time: a second toggle would lose the first one's spinner
                                disabled={!canControl || isError || loaderSet}
                                onChange={(checked) => handleSetRelay({ id, state: checked ? 1 : 0 })}
                            />
                        </li>
                    )
                })}
            </ul>

            {!canControl && (
                <p className={styles.lockNote}>
                    <Icon name={'Lock'} />
                    {t(
                        'components.pages.observatory.relay-list.admins-only',
                        'Управление питанием доступно только администраторам'
                    )}
                </p>
            )}

            <div className={cn(styles.light, optimisticLightOn && styles.on)}>
                <span
                    className={styles.bulb}
                    aria-hidden={'true'}
                >
                    <Icon name={'Sun'} />
                </span>
                <div className={styles.lightText}>
                    <b>{t('components.pages.observatory.relay-list.lightning', 'Освещение')}</b>
                    <span>
                        {countdownTimer > 0
                            ? t(
                                  'components.pages.observatory.relay-list.available-in-seconds',
                                  'Снова доступно через {{count}} с',
                                  { count: countdownTimer }
                              )
                            : t(
                                  'components.pages.observatory.relay-list.turned-on-times',
                                  'Включали {{count}} раз — посмотрите на камере',
                                  { count: relayList?.light.counter ?? 0 }
                              )}
                    </span>
                </div>
                <Button
                    // Not a switch: the light can only be turned on, it goes off by timer
                    mode={'primary'}
                    size={'small'}
                    aria-pressed={optimisticLightOn}
                    loading={lightLoading}
                    disabled={
                        !inView ||
                        isLoading ||
                        isError ||
                        loaderSet ||
                        lightLoading ||
                        !relayList?.light.enable ||
                        countdownTimer > 0 ||
                        optimisticLightOn
                    }
                    label={
                        optimisticLightOn
                            ? t('components.pages.observatory.relay-list.light-on', 'Горит')
                            : t('components.pages.observatory.relay-list.light-turn-on', 'Включить')
                    }
                    onClick={handleLightClick}
                />
            </div>
        </Container>
    )
}
