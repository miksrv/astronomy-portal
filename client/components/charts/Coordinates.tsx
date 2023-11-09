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

interface CoordinatesProps {
    files: TFIle[]
}

const Coordinates: React.FC<CoordinatesProps> = ({ files }) => (
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
                data={files}
                margin={{
                    bottom: 10,
                    left: -15,
                    right: -15,
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
                    stroke={'#38bc57'}
                />
                <YAxis
                    yAxisId={'2'}
                    orientation={'right'}
                    domain={['auto', 'auto']}
                    stroke={'#08B8F4'}
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
                    labelFormatter={(label) =>
                        formatDate(files?.[label]?.date_obs)
                    }
                />
                <Line
                    type={'monotone'}
                    dataKey={'ra'}
                    name={'RA'}
                    unit={'°'}
                    stroke={'#38bc57'}
                    yAxisId={'1'}
                    dot={false}
                />
                <Line
                    type={'monotone'}
                    dataKey={'dec'}
                    name={'DEC'}
                    unit={'°'}
                    stroke={'#08B8F4'}
                    fill={'#8884d8'}
                    yAxisId={'2'}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
)

export default Coordinates
