'use client'

import { API, ApiType } from '@/api'
import { LOCAL_STORAGE } from '@/functions/constants'
import useLocalStorage from '@/functions/hooks/useLocalStorage'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { Button } from 'semantic-ui-react'

import styles from './styles.module.sass'

const LoginForm: React.FC = () => {
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

    return (
        <div className={styles.serviceAuthButtons}>
            <Button
                size={'massive'}
                color={'vk'}
                icon={'vk'}
                onClick={() => handleLoginServiceButton('vk')}
            />

            <Button
                size={'massive'}
                color={'google plus'}
                icon={'google'}
                onClick={() => handleLoginServiceButton('google')}
            />

            <Button
                size={'massive'}
                color={'youtube'}
                icon={'yandex'}
                onClick={() => handleLoginServiceButton('yandex')}
            />
        </div>
    )
}

export default LoginForm
