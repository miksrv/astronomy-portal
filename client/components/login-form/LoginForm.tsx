'use client'

import { API, ApiType, useAppDispatch, useAppSelector } from '@/api'
import { login } from '@/api/authSlice'
import React, { useEffect, useMemo, useState } from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'

import { hide } from '@/components/login-form/loginFormSlice'

import styles from './styles.module.sass'

const LoginForm: React.FC = () => {
    const dispatch = useAppDispatch()
    const { visible } = useAppSelector((state) => state.loginForm)
    const [authLoginPost, { isLoading, isError, data, error }] =
        API.useAuthPostLoginMutation()

    const [formState, setFormState] = useState<ApiType.Auth.ReqLogin>({
        email: '',
        password: ''
    })

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const handleSubmit = () => {
        if (formState) {
            authLoginPost(formState)
        }
    }

    const findError = (field: keyof ApiType.Auth.ReqLogin) =>
        (error as ApiType.ResError)?.messages?.[field] || undefined

    const listErrors: string[] = useMemo(
        () =>
            Object.entries((error as ApiType.ResError)?.messages || []).map(
                ([, value]) => value as string
            ),
        [error]
    )

    useEffect(() => {
        if (data?.token && data?.user?.email) {
            dispatch(hide())
            dispatch(login(data))
        }
    }, [data])

    return (
        <Modal
            size={'mini'}
            open={visible}
            onClose={() => dispatch(hide())}
        >
            <Modal.Header>{'Авторизация'}</Modal.Header>
            <Modal.Content>
                <Form
                    size={'small'}
                    onSubmit={handleSubmit}
                    error={isError}
                    className={styles.loginForm}
                >
                    <Message
                        error
                        list={listErrors}
                        content={
                            !listErrors
                                ? 'Ошибка авторизации, неверный логин или пароль'
                                : undefined
                        }
                    />
                    <Form.Input
                        fluid
                        error={!!findError('email')}
                        name={'email'}
                        icon={'user'}
                        iconPosition={'left'}
                        placeholder={'Email'}
                        className={styles.userInput}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <Form.Input
                        fluid
                        error={!!findError('password')}
                        name={'password'}
                        icon={'lock'}
                        iconPosition={'left'}
                        placeholder={'Пароль'}
                        type={'password'}
                        className={styles.userInput}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                </Form>
            </Modal.Content>
            <Modal.Actions>
                <Button
                    size={'tiny'}
                    onClick={handleSubmit}
                    color={'green'}
                    disabled={
                        isLoading || !formState.email || !formState.password
                    }
                    loading={isLoading}
                >
                    {'Войти'}
                </Button>
                <Button
                    size={'small'}
                    onClick={() => dispatch(hide())}
                    color={'grey'}
                >
                    {'Закрыть'}
                </Button>
            </Modal.Actions>
        </Modal>
    )
}

export default LoginForm
