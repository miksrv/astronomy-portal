import { TFIle } from '@/api/types'
import { formatDate } from '@/functions/helpers'
import React from 'react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    YAxis
} from 'recharts'

interface FilesQualityProps {
    files: TFIle[]
}

const FilesQuality: React.FC<FilesQualityProps> = ({ files }) => (
    <div
        className={'box table'}
        style={{ height: '250px' }}
    >
        <ResponsiveContainer
            width={'100%'}
            height={'100%'}
            style={{ background: '#333333' }}
        >
            <LineChart
                width={800}
                height={300}
                data={files?.filter(({ star_count, hfr }) => star_count && hfr)}
                margin={{
                    bottom: 10,
                    left: -35,
                    right: -25,
                    top: 10
                }}
            >
                <CartesianGrid
                    stroke={'#676767'}
                    strokeDasharray={'3'}
                />
                <YAxis
                    yAxisId={'1'}
                    domain={['auto', 'auto']}
                    type={'number'}
                    stroke={'#b8bc18'}
                />
                <YAxis
                    yAxisId={'2'}
                    orientation={'right'}
                    domain={['auto', 'auto']}
                    stroke={'#e64b24'}
                />
                <YAxis
                    hide={true}
                    yAxisId={'3'}
                    orientation={'right'}
                    domain={['auto', 'auto']}
                    stroke={'#7face6'}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        borderColor: '#808083',
                        color: '#F0F0F0',
                        fontSize: '11px',
                        padding: '5px 10px'
                    }}
                    itemStyle={{ padding: 0 }}
                    labelFormatter={(label) => (
                        <>
                            <div>{formatDate(files?.[label]?.date_obs)}</div>
                            <div>{files?.[label]?.filter}</div>
                        </>
                    )}
                />
                <Line
                    type={'monotone'}
                    dataKey={'hfr'}
                    name={'HFR'}
                    stroke={'#b8bc18'}
                    yAxisId={'1'}
                    dot={false}
                />
                <Line
                    type={'monotone'}
                    dataKey={'star_count'}
                    name={'Stars'}
                    stroke={'#e64b24'}
                    fill={'#8884d8'}
                    yAxisId={'2'}
                    dot={false}
                />
                <Line
                    type={'monotone'}
                    dataKey={'sky_background'}
                    name={'Background'}
                    stroke={'#7face6'}
                    fill={'#8884d8'}
                    yAxisId={'3'}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
)

export default FilesQuality
