import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Message } from 'simple-react-ui-kit'

import { API, ApiType, useAppSelector } from '@/api'

interface EventBookingFormProps {
    eventId?: string
}

type EventBookingFormState = {
    name?: string
    phone?: string
    adults?: string
    children?: string
    childrenAges?: number[]
}

const EventBookingForm: React.FC<EventBookingFormProps> = ({ eventId }) => {
    const user = useAppSelector((state) => state.auth.user)

    // const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<EventBookingFormState>({
        adults: '1',
        children: '0',
        childrenAges: [],
        name: user?.name || '',
        phone: user?.phone || ''
    })

    const [bookEvent, { isLoading, isSuccess, error }] = API.useEventsRegistrationPostMutation()

    const findError = (field: keyof ApiType.Events.ReqRegistration) =>
        (error as ApiType.ResError)?.messages?.[field] || undefined

    const handleChange = ({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) => e.key === 'Enter' && handleSubmit()

    const handleSubmit = useCallback(() => {
        if (!eventId) {
            return
        }

        // setSubmitted(true)

        bookEvent({
            adults: Number(formState.adults || 1),
            children: Number(formState.children || 1),
            childrenAges: formState.childrenAges?.length ? formState.childrenAges : undefined,
            eventId: eventId,
            name: formState.name,
            phone: formState.phone?.length ? formState.phone : undefined
        })
    }, [formState])

    useEffect(() => {
        if (
            formState.childrenAges?.length &&
            (Number(formState.children) > formState.childrenAges.length ||
                formState.childrenAges.length > Number(formState.children))
        ) {
            setFormState({
                ...formState,
                childrenAges: formState.childrenAges.slice(0, Number(formState.children))
            })
        }
    }, [formState?.children])

    return (
        <div
        // className={styles.form}
        // onSubmit={handleSubmit}
        // inverted={true}
        // loading={isLoading}
        // success={isSuccess && submitted}
        // error={isError && submitted}
        // size={'small'}
        >
            <Message
                type={'error'}
                title={'Ошибка'}
            >
                {(error as any)?.messages?.error ||
                    'При регистрации были допущены ошибки, проверьте правильность заполнения полей'}
            </Message>
            <Message
                type={'success'}
                title={'Успешно!'}
            >
                {'Вы зарегистрировались на мероприятие'}
            </Message>
            <Input
                // fluid
                required={true}
                label={'Укажите ваше имя'}
                name={'name'}
                placeholder={'Укажите ваше имя'}
                value={formState.name || ''}
                error={findError('name')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <Input
                // fluid
                label={'Укажите ваш номер телефона'}
                name={'phone'}
                placeholder={'Укажите ваш номер телефона'}
                value={formState.phone || ''}
                error={findError('phone')}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            <div style={{ marginBottom: '15px' }}>
                <div>
                    {/*<Form.Field*/}
                    {/*    label={'Количество взрослых'}*/}
                    {/*    required={true}*/}
                    {/*    error={findError('adults')}*/}
                    {/*    style={{ marginBottom: '5px' }}*/}
                    {/*/>*/}
                    {/*<Input*/}
                    {/*    minValue={1}*/}
                    {/*    maxValue={5}*/}
                    {/*    value={formState.adults || ''}*/}
                    {/*    onChange={(value: string) => {*/}
                    {/*        setFormState({*/}
                    {/*            ...formState,*/}
                    {/*            adults: value*/}
                    {/*        })*/}
                    {/*    }}*/}
                    {/*    onKeyDown={handleKeyDown}*/}
                    {/*/>*/}
                </div>
                <div>
                    {/*<Form.Field*/}
                    {/*    label={'Количество детей'}*/}
                    {/*    required={true}*/}
                    {/*    error={findError('children')}*/}
                    {/*    style={{ marginBottom: '5px' }}*/}
                    {/*/>*/}
                    {/*<Input*/}
                    {/*    minValue={0}*/}
                    {/*    maxValue={5}*/}
                    {/*    value={formState.children || ''}*/}
                    {/*    onChange={(value: string) => {*/}
                    {/*        setFormState({*/}
                    {/*            ...formState,*/}
                    {/*            children: value*/}
                    {/*        })*/}
                    {/*    }}*/}
                    {/*    onKeyDown={handleKeyDown}*/}
                    {/*/>*/}
                </div>
            </div>
            {/*{formState.children &&*/}
            {/*    Number(formState.children) > 0 &&*/}
            {/*    Array.from(*/}
            {/*        { length: Number(formState.children) },*/}
            {/*        (_, index) => (*/}
            {/*            <div*/}
            {/*                className={styles.childrenAges}*/}
            {/*                key={index}*/}
            {/*            >*/}
            {/*                <label>Возраст ребенка {index + 1}</label>*/}
            {/*                <Dropdown*/}
            {/*                    placeholder='Выберите возраст'*/}
            {/*                    fluid*/}
            {/*                    selection*/}
            {/*                    options={[...Array(13)].map((_, age) => ({*/}
            {/*                        key: age + 5,*/}
            {/*                        text: `${age + 5} лет`,*/}
            {/*                        value: age + 5*/}
            {/*                    }))}*/}
            {/*                    value={formState?.childrenAges?.[index] || ''}*/}
            {/*                    onChange={(e, { value }) => {*/}
            {/*                        const newAges = [*/}
            {/*                            ...(formState?.childrenAges ?? [])*/}
            {/*                        ]*/}

            {/*                        newAges[index] = Number(value)*/}

            {/*                        setFormState({*/}
            {/*                            ...formState,*/}
            {/*                            childrenAges: newAges*/}
            {/*                        })*/}
            {/*                    }}*/}
            {/*                />*/}
            {/*            </div>*/}
            {/*        )*/}
            {/*    )}*/}
            <p>
                * Максимум <b>5</b> взрослых и <b>5</b> детей на одну регистрацию.
            </p>

            <Button
                // fluid={true}
                // size={'tiny'}
                color={'green'}
                onClick={handleSubmit}
                disabled={isLoading || isSuccess || Number(formState?.children) !== formState?.childrenAges?.length}
                loading={isLoading}
            >
                {'Забронировать'}
            </Button>
        </div>
    )
}

export default EventBookingForm
