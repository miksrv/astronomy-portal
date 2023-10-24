import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

const Error404Page: NextPage = () => (
    <main>
        <NextSeo title={'Ошибка 404 - Такой страницы не существует'} />
        <div className={'errorPage'}>
            <h1>Houston, we have a problem</h1>
            <h2>404 - Страница не найдена</h2>
            <p>
                Возможно, страница, которую вы ищете, была удалена,
                <br />
                переименована или временно недоступна.
            </p>
        </div>
    </main>
)

export default Error404Page
