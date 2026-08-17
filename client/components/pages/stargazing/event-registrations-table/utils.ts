export const truncateOrderId = (orderId: string): string =>
    orderId.length > 14 ? `${orderId.slice(0, 8)}…${orderId.slice(-4)}` : orderId
