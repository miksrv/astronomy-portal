'use client'

import { useAppDispatch, useAppSelector } from '@/api'
import React from 'react'
import { Modal } from 'semantic-ui-react'

import LoginForm from '@/components/login-form'
import { hide } from '@/components/login-modal/loginModalSlice'

import styles from './styles.module.sass'

const LoginModal: React.FC = () => {
    const { visible } = useAppSelector((state) => state.loginModal)

    const dispatch = useAppDispatch()

    return (
        <Modal
            size={'mini'}
            open={visible}
            onClose={() => dispatch(hide())}
        >
            <Modal.Header>{'Авторизация'}</Modal.Header>
            <Modal.Content className={styles.loginModalContent}>
                <p style={{ textAlign: 'center' }}>
                    Войдите на сайт под своей учетной записью. Выберите один из
                    сервисов, где вы зарегистрированы:{' '}
                </p>
                <LoginForm />
            </Modal.Content>
        </Modal>
    )
}

export default LoginModal
