export const LOCAL_STORAGE_KEY = 'astro'

export const LOCAL_STORAGE = {
    AUTH_TOKEN: 'token',
    LOCALE: 'locale',
    RETURN_PATH: 'returnPath'
}

export const SITE_LINK = process.env.NEXT_PUBLIC_SITE_LINK

export const HOST_API = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080/'

export const HOST_IMG = process.env.NEXT_PUBLIC_IMG_HOST || HOST_API
