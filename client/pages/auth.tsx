'use client'

import { API, ApiType } from '@/api'
import { login } from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/store'
import { LOCAL_STORAGE } from '@/tools/constants'
import useLocalStorage from '@/tools/hooks/useLocalStorage'
import { NextPage } from 'next'
import { useRouter } from 'next/dist/client/router'
import { useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

interface AuthPageProps {}

const AuthPage: NextPage<AuthPageProps> = () => {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [returnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const code = searchParams.get('code')
    const service = searchParams.get('service')
    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [serviceLogin, { data }] = API.useAuthLoginServiceMutation()

    useEffect(() => {
        if (isAuth && !data) {
            router.push('/')
        }
    })

    useEffect(() => {
        if (code && service) {
            serviceLogin({
                code,
                device_id: searchParams.get('device_id') ?? undefined,
                service: service as ApiType.Auth.AuthServiceType,
                state: searchParams.get('state') ?? undefined
            })
        }
    }, [code, service])

    useEffect(() => {
        if (data?.auth === true) {
            dispatch(login(data))

            if (returnPath) {
                router.push(returnPath)
                localStorage.removeItem(LOCAL_STORAGE.RETURN_PATH)
            } else {
                router.push('/')
            }
        }
    }, [data])

    return (
        <div>
            <Dimmer active={true}>
                <Loader content='Пожалуйста, подождите...' />
            </Dimmer>
        </div>
    )
}

export default AuthPage
