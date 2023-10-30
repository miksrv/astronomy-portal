import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts/highmaps'
import { mergeDeep } from 'immutable'
import React, { useEffect, useRef, useState } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import chartInitialConfig from './config'

type TChartProps = {
    loading: boolean
    config: any
    data?: any
}

const Chart: React.FC<TChartProps> = ({ loading, config, data }) => {
    let height =
        typeof config.chart !== 'undefined' && typeof config.chart.height
            ? config.chart.height
            : 300

    const chartRef = useRef<any>()
    const [chartOptions, setChartOptions] = useState<any>()

    useEffect(() => {
        if (data && !loading) {
            let dIndex = 0
            data.forEach((item: any | undefined) => {
                if (typeof item !== 'undefined' && config.series[dIndex]) {
                    config.series[dIndex].data = item
                    dIndex++
                }
            })

            setChartOptions(mergeDeep(chartInitialConfig, config))
        }
    }, [config, data, loading])

    return (
        <div className={'box table'}>
            {loading || !chartOptions ? (
                <div style={{ height: height }}>
                    <Dimmer active>
                        <Loader />
                    </Dimmer>
                </div>
            ) : (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={chartOptions}
                    constructorType={'chart'}
                    ref={chartRef}
                />
            )}
        </div>
    )
}

export default Chart
