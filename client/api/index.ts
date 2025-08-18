import { API, HOST_API, HOST_IMG, SITE_LINK } from './api'
import { APIMeteo } from './apiMeteo'
import { setLocale } from './applicationSlice'
import * as ApiModel from './models'
import { useAppDispatch, useAppSelector, wrapper } from './store'
import * as ApiType from './types'

export {
    API,
    APIMeteo,
    ApiModel,
    ApiType,
    HOST_API,
    HOST_IMG,
    setLocale,
    SITE_LINK,
    useAppDispatch,
    useAppSelector,
    wrapper
}
