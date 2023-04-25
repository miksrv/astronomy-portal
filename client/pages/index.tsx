import {
    catalogGetList,
    getRunningQueriesThunk,
    useCatalogGetListQuery, // useGetFilesMonthMutation,
    usePhotoGetListQuery // useGetWeatherMonthMutation
} from '@/api/api'
import { wrapper } from '@/api/store'
// import { TCatalog, TPhoto } from '@/api/types'
// import { shuffle } from '@/functions/helpers'
// import moment, { Moment } from 'moment'
import { NextSeo } from 'next-seo'
import React from 'react'

// import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(catalogGetList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

export default function Home() {
    // const [date, setDate] = React.useState<Moment>(moment())

    const { data: photoData, isLoading: photoLoading } = usePhotoGetListQuery({
        limit: 4
    })
    const { data: catalogData, isLoading: catalogLoading } =
        useCatalogGetListQuery()

    // const [photos, setPhotos] = React.useState<
    //     (TPhoto[] & TCatalog[]) | undefined
    // >(undefined)

    // const [getWeatherMonth, { data: weatherData, isLoading: weatherLoading }] =
    //     useGetWeatherMonthMutation()
    // const [getFilesMonth, { data: filesData, isLoading: filesLoading }] =
    //     useGetFilesMonthMutation()

    // React.useEffect(() => {
    //     if (photoData?.payload && photos === undefined) {
    //         const randomPhotos = shuffle(photoData.payload.slice()).slice(0, 4)
    //
    //         setPhotos(randomPhotos)
    //     }
    // }, [photoData?.payload, photos])

    // React.useEffect(() => {
    //     const getWeather = async () => {
    //         try {
    //             const monthYear = moment(date).format('Y-MM')
    //             await getWeatherMonth(monthYear).unwrap()
    //             await getFilesMonth(monthYear).unwrap()
    //         } catch (error) {
    //             return null
    //         }
    //     }
    //
    //     getWeather().finally()
    // }, [getWeatherMonth, getFilesMonth, date])

    return (
        <main>
            <NextSeo
                title={'Любительская астрономическая обсерватория'}
                description={
                    'Самодельная любительская астрономическая обсерватория с удаленным доступом из любой точки мира через интернет. Статистика работы обсерватории, количество отснятых кадров и накопленных данных. Календарь работы телескопа.'
                }
                openGraph={{
                    images: [
                        {
                            height: 819,
                            url: '/main/dashboard.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <Statistic />
            <br />
            <PhotoGrid
                loading={photoLoading || catalogLoading}
                loaderCount={4}
                photos={photoData?.items}
                catalog={catalogData?.items}
            />
            {/*<br />*/}
            {/*<Calendar*/}
            {/*    loading={weatherLoading || filesLoading}*/}
            {/*    eventsWeather={*/}
            {/*        weatherData?.payload ? weatherData?.payload.weather : []*/}
            {/*    }*/}
            {/*    eventsTelescope={filesData?.payload ? filesData.payload : []}*/}
            {/*    changeDate={(date) => setDate(date)}*/}
            {/*/>*/}
        </main>
    )
}
