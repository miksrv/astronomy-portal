import { API, ApiModel } from '@/api'
import { wrapper } from '@/api/store'
import { sliceText } from '@/functions/helpers'
import Container from '@/ui/container'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import React from 'react'
import Markdown from 'react-markdown'

interface StargazingItemPageProps {
    event: ApiModel.Event | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({ event }) => (
    <main>
        <NextSeo
            title={`Астровыезд - ${event?.title}`}
            description={sliceText(event?.content ?? '', 300)}
            openGraph={{
                images: [
                    {
                        height: 743,
                        url: `${process.env.NEXT_PUBLIC_API_HOST}${event?.cover}`,
                        width: 1280
                    }
                ],
                locale: 'ru'
            }}
        />

        <Container>
            <h1 className={'pageTitle'}>{`Астровыезд - ${event?.title}`}</h1>

            <Image
                className={'stargazingImage'}
                src={`${process.env.NEXT_PUBLIC_API_HOST}${event?.cover}`}
                alt={`Астровыезд: ${event?.title}`}
                width={1024}
                height={768}
                style={{ width: '100%' }}
            />

            <br />
            <br />

            <Markdown>{event?.content}</Markdown>
        </Container>
    </main>
)

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingItemPageProps>> => {
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            const { data, isError } = await store.dispatch(
                API.endpoints?.eventGetItem.initiate(eventId)
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    event: data || null
                }
            }
        }
)

export default StargazingItemPage
