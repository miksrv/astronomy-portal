import React from 'react'
import { cn, Skeleton } from 'simple-react-ui-kit'

import { ApiModel } from '@/api'

import { Chart } from './Chart'
import { ChartTypes } from './types'

import styles from './styles.module.sass'

interface WidgetProps {
    loading?: boolean
    fullWidth?: boolean
    data?: ApiModel.Weather[]
    type: ChartTypes
    dateFormat?: string
}

const CHART_HEIGHT = '260px'

export const WidgetChart: React.FC<WidgetProps> = ({ loading, fullWidth, data, type, dateFormat }) => (
    <div className={cn(styles.widget, fullWidth && styles.fullWidth)}>
        {loading ? (
            <Skeleton style={{ width: '100%', height: CHART_HEIGHT }} />
        ) : (
            <Chart
                data={data}
                type={type}
                height={CHART_HEIGHT}
                dateFormat={dateFormat}
            />
        )}
    </div>
)
