import React from 'react'

const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns={'http://www.w3.org/2000/svg'}
        viewBox={'0 0 24 24'}
        fill={'none'}
        {...props}
    >
        <path
            d={'M8 11V7a4 4 0 1 1 8 0v4'}
            stroke={'currentColor'}
            strokeWidth={2}
            strokeLinecap={'round'}
        />
        <rect
            x={5}
            y={11}
            width={14}
            height={10}
            rx={2}
            fill={'currentColor'}
        />
        <circle
            cx={12}
            cy={16}
            r={1.5}
            fill={'var(--color-primary-background, #1e1c38)'}
        />
    </svg>
)

export default LockIcon
