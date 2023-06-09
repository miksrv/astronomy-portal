// import { useGetSensorStatisticQuery } from '@/api/api'
// import { TSensorsPayload } from '@/api/types'
// import React from 'react'
// import { Dimmer, Message } from 'semantic-ui-react'
//
// import Chart from '@/components/chart'
// import { TChartLineData } from '@/components/chart/types'
//
// import chart_sensors from './chart_sensors'
// import styles from './styles.module.sass'
//
// const Sensors: React.FC = () => {
//     const { data, isLoading, isFetching } = useGetSensorStatisticQuery()
//
//     const [chartData, setChartData] = React.useState<any>([])
//
//     React.useEffect(() => {
//         if (data?.payload.length) {
//             const chartT: TChartLineData[] = []
//             const chartH: TChartLineData[] = []
//             const chartT1: TChartLineData[] = []
//             const chartT2: TChartLineData[] = []
//             const chartT3: TChartLineData[] = []
//
//             data.payload.forEach((item: TSensorsPayload) => {
//                 chartH.push([item.time, item.sensors.h ?? 0])
//                 chartT.push([item.time, item.sensors.t ?? 0])
//                 chartT1.push([item.time, item.sensors.t1 ?? 0])
//                 chartT2.push([item.time, item.sensors.t2 ?? 0])
//                 chartT3.push([item.time, item.sensors.t3 ?? 0])
//             })
//
//             setChartData([chartH, chartT, chartT1, chartT2, chartT3])
//         }
//     }, [data])
//
//     return (
//         <div className={styles.sensorsContainer}>
//             {!data?.status ? (
//                 <Dimmer active>
//                     <Message
//                         error
//                         icon={'chart line'}
//                         header={'Данные не доступны'}
//                         content={
//                             'Сенсоры обсерватории временно не передают значения'
//                         }
//                     />
//                 </Dimmer>
//             ) : (
//                 <Chart
//                     loader={isFetching || isLoading || !chartData.length}
//                     config={chart_sensors}
//                     data={chartData}
//                 />
//             )}
//         </div>
//     )
// }
//
// export default Sensors
