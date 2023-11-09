import { TFIle } from '@/api/types'
import React from 'react'
import {
    CartesianGrid,
    Cell,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis
} from 'recharts'

interface DeviationProps {
    files: TFIle[]
}

const Deviation: React.FC<DeviationProps> = ({ files }) => (
    <div
        className={'box table'}
        style={{ height: '250px' }}
    >
        <ResponsiveContainer
            width={'100%'}
            height={'100%'}
            style={{ background: '#333333' }}
        >
            <ScatterChart
                width={800}
                height={300}
                margin={{
                    bottom: 10,
                    left: 10,
                    right: 10,
                    top: 10
                }}
            >
                <CartesianGrid
                    stroke={'#676767'}
                    strokeDasharray={'3'}
                />
                <XAxis
                    hide={true}
                    type={'number'}
                    dataKey={'ra'}
                    name={'RA'}
                    unit={'°'}
                    domain={['auto', 'auto']}
                />
                <YAxis
                    tickCount={10}
                    hide={true}
                    type={'number'}
                    dataKey={'dec'}
                    name={'DEC'}
                    unit={'°'}
                    domain={['auto', 'auto']}
                />
                <ZAxis range={[20, 25]} />
                <ReferenceLine
                    x={
                        files.reduce((total, next) => total + next.ra, 0) /
                        files.length
                    }
                    stroke={'red'}
                    strokeDasharray={'3 3'}
                />
                <ReferenceLine
                    y={
                        files.reduce((total, next) => total + next.dec, 0) /
                        files.length
                    }
                    stroke={'red'}
                    strokeDasharray={'3 3'}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        borderColor: '#808083',
                        color: '#F0F0F0',
                        fontSize: '11px',
                        padding: '5px 10px'
                    }}
                    cursor={{ strokeDasharray: '3 3' }}
                    itemStyle={{
                        color: '#F0F0F0',
                        padding: 0
                    }}
                />
                <Scatter
                    stroke={'#e6a241'}
                    data={files}
                >
                    {files?.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={'#e6a241'}
                        />
                    ))}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>
    </div>
)

export default Deviation
