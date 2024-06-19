import { API, ApiModel, ApiType } from '@/api'
import isEqual from 'lodash-es/isEqual'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form, Grid, Message, Modal } from 'semantic-ui-react'

import styles from './styles.module.sass'

interface EventBookingFormProps {}

const EventBookingForm: React.FC<EventBookingFormProps> = (props) => {
    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<any>()

    // const handleChange = ({
    //     target: { name, value }
    // }: React.ChangeEvent<HTMLInputElement>) =>
    //     setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const handleSubmit = useCallback(() => {
        setSubmitted(true)
    }, [formState])

    return (
        <Form
            className={styles.form}
            onSubmit={handleSubmit}
            inverted={true}
            // loading={createLoading || updateLoading}
            // success={(createSuccess || updateSuccess) && submitted}
            // error={(createError || updateError) && submitted}
            size={'small'}
        >
            {/*<Message*/}
            {/*    error*/}
            {/*    header={'Ошибка сохранения'}*/}
            {/*    content={*/}
            {/*        'При сохранении категории были допущены ошибки, проверьте правильность заполнения полей'*/}
            {/*    }*/}
            {/*/>*/}
            {/*<Message*/}
            {/*    success*/}
            {/*    header={'Категория сохранена'}*/}
            {/*    content={'Все данные категории успешно сохранены'}*/}
            {/*/>*/}
            <Form.Input
                fluid
                label={'Укажите ваше имя'}
                name={'name'}
                placeholder={'Укажите ваше имя'}
                // onChange={handleChange}
                onKeyDown={handleKeyDown}
                // defaultValue={value?.name}
                // error={findError('name')}
            />

            <Form.Input
                fluid
                label={'Укажите ваш номер телефона'}
                name={'phone'}
                placeholder={'Укажите ваш номер телефона'}
                // onChange={handleChange}
                onKeyDown={handleKeyDown}
                // defaultValue={value?.name}
                // error={findError('name')}
            />

            <Grid style={{ marginBottom: '15px' }}>
                <Grid.Column width={8}>
                    <Form.Input
                        fluid
                        label={'Количество взрослых'}
                        name={'adults'}
                        value={1}
                        type={'number'}
                        // onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        // defaultValue={value?.name}
                        // error={findError('name')}
                    />
                </Grid.Column>
                <Grid.Column width={8}>
                    <Form.Input
                        fluid
                        label={'Количество детей'}
                        name={'children'}
                        value={0}
                        type={'number'}
                        // onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        // defaultValue={value?.name}
                        // error={findError('name')}
                    />
                </Grid.Column>
            </Grid>

            <Button
                fluid={true}
                size={'tiny'}
                color={'green'}
                // onClick={onClickSave}
                // disabled={disabled}
                // loading={loading}
            >
                {'Забронировать'}
            </Button>
        </Form>
    )
}

export default EventBookingForm
