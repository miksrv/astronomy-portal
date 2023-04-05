import {
    getCatalogList,
    getRunningQueriesThunk,
    useGetFilesMonthMutation,
    useGetPhotoListQuery,
    useGetStatisticQuery,
    useGetWeatherMonthMutation
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TCatalog, TPhoto } from '@/api/types'
import { shuffle } from '@/functions/helpers'
import moment, { Moment } from 'moment'
import React from 'react'

import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getCatalogList.initiate())

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})

export default function Home() {
    const [date, setDate] = React.useState<Moment>(moment())
    const { data: statisticData, isLoading: statisticLoading } =
        useGetStatisticQuery()
    const { data: photoData, isLoading: photosLoading } = useGetPhotoListQuery()
    const [photos, setPhotos] = React.useState<
        (TPhoto[] & TCatalog[]) | undefined
    >(undefined)
    const [getWeatherMonth, { data: weatherData, isLoading: weatherLoading }] =
        useGetWeatherMonthMutation()
    const [getFilesMonth, { data: filesData, isLoading: filesLoading }] =
        useGetFilesMonthMutation()

    React.useEffect(() => {
        if (photoData?.payload && photos === undefined) {
            const randomPhotos = shuffle(photoData.payload.slice()).slice(0, 4)

            setPhotos(randomPhotos)
        }
    }, [photoData?.payload, photos])

    React.useEffect(() => {
        const getWeather = async () => {
            try {
                const monthYear = moment(date).format('Y-MM')
                await getWeatherMonth(monthYear).unwrap()
                await getFilesMonth(monthYear).unwrap()
            } catch (error) {
                return null
            }
        }

        getWeather().finally()
    }, [getWeatherMonth, getFilesMonth, date])

    return (
        <main>
            <Statistic
                loader={statisticLoading}
                frames={statisticData?.payload.frames}
                exposure={statisticData?.payload.exposure}
                objects={statisticData?.payload.objects}
                filesize={statisticData?.payload.filesize}
            />
            <br />
            <PhotoGrid
                loading={photosLoading}
                loaderCount={4}
                photoList={photos}
            />
            <br />
            <Calendar
                loading={weatherLoading || filesLoading}
                eventsWeather={
                    weatherData?.payload ? weatherData?.payload.weather : []
                }
                eventsTelescope={filesData?.payload ? filesData.payload : []}
                changeDate={(date) => setDate(date)}
            />
        </main>
    )
}
