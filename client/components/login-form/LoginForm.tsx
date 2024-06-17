'use client'

import { API, ApiType, useAppDispatch, useAppSelector } from '@/api'
import { LOCAL_STORAGE } from '@/functions/constants'
import useLocalStorage from '@/functions/hooks/useLocalStorage'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { Button, Icon, Modal } from 'semantic-ui-react'

import { hide } from '@/components/login-form/loginFormSlice'

import styles from './styles.module.sass'

const LoginForm: React.FC = () => {
    const { visible } = useAppSelector((state) => state.loginForm)

    const dispatch = useAppDispatch()
    const router = useRouter()

    const [, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    // const [localeError, setLocaleError] = useState<string>('')

    const [
        authLoginService,
        {
            data: serviceData
            // isLoading: serviceLoading,
            // isSuccess: serviceSuccess,
            // isError: serviceError
        }
    ] = API.useAuthLoginServiceMutation()

    const handleLoginServiceButton = (
        service: ApiType.Auth.AuthServiceType
    ) => {
        setReturnPath(router.asPath)
        authLoginService({ service })
    }

    useEffect(() => {
        if (serviceData?.redirect && typeof window !== 'undefined') {
            window.location.href = serviceData.redirect
        }
    }, [serviceData?.redirect])

    // useEffect(() => {
    //     if (serviceError) {
    //         setLocaleError('Ошибка авторизации через сервис')
    //     }
    // }, [serviceError])

    return (
        <Modal
            size={'mini'}
            open={visible}
            onClose={() => dispatch(hide())}
        >
            <Modal.Header>{'Авторизация'}</Modal.Header>
            <Modal.Content className={styles.loginModalContent}>
                <Button
                    color={'google plus'}
                    fluid={true}
                    onClick={() => handleLoginServiceButton('google')}
                >
                    <Icon name={'google'} /> {'Google'}
                </Button>
                <Button
                    color={'youtube'}
                    fluid={true}
                    onClick={() => handleLoginServiceButton('yandex')}
                >
                    <Icon name={'yandex'} /> {'Яндекс'}
                </Button>
                {/*<Button*/}
                {/*    color={'vk'}*/}
                {/*    fluid={true}*/}
                {/*    disabled={true}*/}
                {/*>*/}
                {/*    <Icon name={'vk'} /> {'Вконтакте'}*/}
                {/*</Button>*/}
            </Modal.Content>
        </Modal>
    )
}

export default LoginForm
