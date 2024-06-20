import { API, ApiType, useAppSelector } from '@/api'
import React, { useCallback, useState } from 'react'
import { Button, Form, Grid, Message } from 'semantic-ui-react'

import styles from './styles.module.sass'

interface EventBookingFormProps {
    eventId?: string
}

type EventBookingFormState = {
    name?: string
    phone?: string
    adults?: string
    children?: string
}

const EventBookingForm: React.FC<EventBookingFormProps> = ({ eventId }) => {
    const user = useAppSelector((state) => state.auth.user)

    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<EventBookingFormState>({
        adults: '1',
        children: '0',
        name: user?.name || '',
        phone: user?.phone || ''
    })

    const [bookEvent, { isLoading, isSuccess, isError, error, data }] =
        API.useEventsRegistrationPostMutation()

    const findError = (field: keyof ApiType.Events.ReqRegistration) =>
        (error as ApiType.ResError)?.messages?.[field] || undefined

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const handleSubmit = useCallback(() => {
        if (!eventId) {
            return
        }

        setSubmitted(true)

        bookEvent({
            adults: Number(formState.adults || 1),
            children: Number(formState.children || 1),
            eventId: eventId,
            name: formState.name,
            phone: formState.phone?.length ? formState.phone : undefined
        })
    }, [formState])

    return (
        <Form
            className={styles.form}
            onSubmit={handleSubmit}
            inverted={true}
            loading={isLoading}
            success={isSuccess && submitted}
            error={isError && submitted}
            size={'small'}
        >
            <Message
                error
                header={'Ошибка'}
                content={
                    (error as any)?.messages?.error ||
                    'При регистрации были допущены ошибки, проверьте правильность заполнения полей'
                }
            />
            <Message
                success
                header={'Успешно!'}
                content={'Вы зарегистрировались на мероприятие'}
            />
            <Form.Input
                fluid
                label={'Укажите ваше имя'}
                name={'name'}
                placeholder={'Укажите ваше имя'}
                value={formState.name || ''}
                error={findError('name')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <Form.Input
                fluid
                label={'Укажите ваш номер телефона'}
                name={'phone'}
                placeholder={'Укажите ваш номер телефона'}
                value={formState.phone || ''}
                error={findError('phone')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <Grid style={{ marginBottom: '15px' }}>
                <Grid.Column width={8}>
                    <Form.Input
                        fluid
                        label={'Количество взрослых'}
                        name={'adults'}
                        type={'number'}
                        value={formState.adults || ''}
                        error={findError('adults')}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                    />
                </Grid.Column>
                <Grid.Column width={8}>
                    <Form.Input
                        fluid
                        label={'Количество детей'}
                        name={'children'}
                        type={'number'}
                        value={formState.children || ''}
                        error={findError('children')}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                    />
                </Grid.Column>
            </Grid>

            <Button
                fluid={true}
                size={'tiny'}
                color={'green'}
                onClick={handleSubmit}
                disabled={isLoading || isSuccess}
                loading={isLoading}
            >
                {'Забронировать'}
            </Button>
        </Form>
    )
}

export default EventBookingForm
