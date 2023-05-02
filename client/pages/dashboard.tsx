import { NextSeo } from 'next-seo'
import React from 'react'
import { Grid } from 'semantic-ui-react'

import AstronomyCalc from '@/components/astronomy-calc'
import Camera from '@/components/camera'
import RelayList from '@/components/relay-list'
import Weather from '@/components/weather'

const Dashboard: React.FC = () => (
    <main>
        <NextSeo
            title={'Панель управления обсерваторией'}
            description={
                'Панель управления оборудованием любительской обсерваторией и телескопом - онлайн камеры внутри обсерватории и звездного неба, параметры с сенсоров, астрономический календарь'
            }
            openGraph={{
                images: [
                    {
                        height: 710,
                        url: '/screenshots/dashboard.jpg',
                        width: 1280
                    }
                ],
                locale: 'ru'
            }}
        />
        <Grid>
            <Grid.Column
                computer={8}
                tablet={8}
                mobile={16}
            >
                <Weather />
                <br />
                <RelayList />
            </Grid.Column>
            <Grid.Column
                computer={8}
                tablet={8}
                mobile={16}
            >
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/2`}
                />
            </Grid.Column>
            <Grid.Column
                computer={8}
                tablet={8}
                mobile={16}
            >
                <AstronomyCalc />
                <br />
                {/*<Sensors />*/}
            </Grid.Column>
            <Grid.Column
                computer={8}
                tablet={8}
                mobile={16}
            >
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/1`}
                    interval={30}
                />
            </Grid.Column>
        </Grid>
    </main>
)

export default Dashboard
