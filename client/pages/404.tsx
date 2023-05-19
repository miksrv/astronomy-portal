import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

const Error404: NextPage = () => {
    return (
        <main>
            <NextSeo title={'Ошибка 404 - Такой страницы не существует'} />
            <div className={'error'}>
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
}

export default Error404
