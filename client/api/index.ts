import { API } from './api'
import { APIMeteo } from './apiMeteo'
import { setLocale } from './applicationSlice'
import * as ApiModel from './models'
import { useAppDispatch, useAppSelector, wrapper } from './store'
import * as ApiType from './types'

export { HOST_API, HOST_IMG, SITE_LINK } from '@/utils/constants'
export { encodeQueryData } from '@/utils/helpers'

export { API, APIMeteo, ApiModel, ApiType, setLocale, useAppDispatch, useAppSelector, wrapper }
