import { API, ApiType } from '@/api'
import { login } from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/store'
import { LOCAL_STORAGE } from '@/functions/constants'
import useLocalStorage from '@/functions/hooks/useLocalStorage'
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

    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [serviceLogin, { data }] = API.useAuthLoginServiceMutation()

    useEffect(() => {
        if (isAuth) {
            router.push('/')
        }
    })

    useEffect(() => {
        if (data?.auth === true) {
            dispatch(login(data))

            if (returnPath) {
                const returnLink = returnPath

                localStorage.removeItem(LOCAL_STORAGE.RETURN_PATH)

                router.push(returnLink)
            } else {
                router.push('/')
            }
        }
    }, [data])

    useEffect(() => {
        const code = searchParams.get('code')
        const service = searchParams.get(
            'service'
        ) as ApiType.Auth.AuthServiceType

        if (code && service) {
            serviceLogin({ code, service })
        } else {
            router.push('/')
        }
    }, [searchParams])

    return (
        <div>
            <Dimmer active={true}>
                <Loader content='Пожалуйста, подождите...' />
            </Dimmer>
        </div>
    )
}

export default AuthPage
