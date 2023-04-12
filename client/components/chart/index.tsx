import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts/highmaps'
import React, { useEffect } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import chartInitialConfig from './config'

type TChartProps = {
    loader: boolean
    config: any
    data: any
}

const Chart: React.FC<TChartProps> = (params) => {
    const { loader, config, data } = params
    let dIndex = 0
    let height =
        typeof config.chart !== 'undefined' && typeof config.chart.height
            ? config.chart.height
            : 300

    data.forEach((item: any | undefined) => {
        if (typeof item !== 'undefined') {
            config.series[dIndex].data = item
            dIndex++
        }
    })

    useEffect(() => {
        Highcharts.setOptions(chartInitialConfig)
    })

    return (
        <div className='box table'>
            {loader ? (
                <div style={{ height: height }}>
                    <Dimmer active>
                        <Loader />
                    </Dimmer>
                </div>
            ) : (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={config}
                    immutable={true}
                />
            )}
        </div>
    )
}

export default Chart