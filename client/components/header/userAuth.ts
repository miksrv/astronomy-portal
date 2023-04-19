// 'use client'
//
// import { useLoginCheckMutation } from '@/api/api'
// import { setCredentials } from '@/api/authSlice'
// import { useAppDispatch, useAppSelector } from '@/api/hooks'
// import { useCallback, useEffect, useState } from 'react'
//
// const TIMEOUT = 30000
//
// export const UserAuth = () => {
//     const dispatch = useAppDispatch()
//     const user = useAppSelector((state) => state.auth)
//     const [token, setToken] = useState<string>('')
//     const [kepAlive, setKeepAlive] = useState<any>()
//     const [loginCheck] = useLoginCheckMutation()
//
//     useEffect(() => {
//         if (sessionStorage) {
//             setToken(sessionStorage.getItem('token') || '')
//         }
//     }, [])
//
//     const doCheckToken = useCallback(async () => {
//         try {
//             const check = await loginCheck().unwrap()
//
//             if (check.status === false) {
//                 sessionStorage.setItem('token', '')
//             }
//
//             dispatch(setCredentials(check))
//         } catch (error) {
//             console.error(error)
//         }
//     }, [dispatch, loginCheck])
//
//     const startPingTimer = useCallback(() => {
//         const kepAlive = setInterval(() => doCheckToken(), TIMEOUT)
//         setKeepAlive(kepAlive)
//     }, [doCheckToken])
//
//     // Если нет токена в хранилие - ставим
//     if (user.token && user.token !== token) {
//         sessionStorage.setItem('token', user.token)
//
//         // Если токен есть в хранилище, но нет в стор
//     } else if (!user.token && token) {
//         dispatch(setCredentials({ status: false, token: token }))
//         doCheckToken().finally()
//     }
//
//     useEffect(() => {
//         // Если пользователь авторизован, но пинг не запущен
//         if (user.token && user.status && !kepAlive) {
//             startPingTimer()
//         } else if (!user.token && !user.status && kepAlive) {
//             clearInterval(kepAlive)
//         }
//     }, [user, kepAlive, startPingTimer])
//
//     return user
// }
