import { usePostAuthLoginMutation } from '@/api/api'
import { login } from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIRequestLogin } from '@/api/types'
import React, { useState } from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'

import { hide } from '@/components/login-form/loginFormSlice'

import styles from './styles.module.sass'

const LoginForm: React.FC = () => {
    const dispatch = useAppDispatch()
    const { visible } = useAppSelector((state) => state.loginForm)
    const [loginMutation, { isLoading }] = usePostAuthLoginMutation()
    const [errors, setErrors] = React.useState<any | undefined>(undefined)
    const [formState, setFormState] = useState<APIRequestLogin>({
        email: '',
        password: ''
    })

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const handleSubmit = async () => {
        const result: any = await loginMutation(formState)

        if (result.error?.data.messages) {
            setErrors(result.error?.data.messages)
        }

        if (result.data?.access_token) {
            setErrors(undefined)
            dispatch(hide())
            dispatch(login(result.data))
        }
    }

    const listErrors: string[] = React.useMemo(
        () =>
            Object.entries(errors || []).map(([key, value]) => value as string),
        [errors]
    )

    return (
        <Modal
            size={'tiny'}
            open={visible}
            onClose={() => dispatch(hide())}
        >
            <Modal.Header>Авторизация</Modal.Header>
            <Modal.Content>
                <Message
                    error
                    hidden={!errors}
                    list={listErrors}
                    content={
                        !listErrors
                            ? 'Ошибка авторизации, неверный логин или пароль'
                            : undefined
                    }
                />
                <Form
                    size={'large'}
                    onSubmit={handleSubmit}
                    className={styles.loginForm}
                >
                    <Form.Input
                        fluid
                        error={!!errors?.['email']}
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
                        error={!!errors?.['password']}
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
                    Войти
                </Button>
                <Button
                    size={'small'}
                    onClick={() => dispatch(hide())}
                    color={'grey'}
                >
                    Отмена
                </Button>
            </Modal.Actions>
        </Modal>
    )
}

export default LoginForm
