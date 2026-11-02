export interface Weather {
    temperature?: number
    feelsLike?: number
    pressure?: number
    humidity?: number
    dewPoint?: number
    visibility?: number
    uvIndex?: number
    solEnergy?: number
    solRadiation?: number
    clouds?: number
    precipitation?: number
    windSpeed?: number
    windGust?: number
    windDeg?: number
    weatherId?: number
    /** UTC, "YYYY-MM-DD HH:mm:ss" */
    date?: string
    /** UTC, ISO 8601: when the station last reported (`GET /current`) */
    lastUpdated?: string
    /** The station hasn't reported for a while (`GET /current`) */
    isStale?: boolean
    /** Daily forecast only */
    temperatureMin?: number
    temperatureMax?: number
    windSpeedMax?: number
    precipitationHours?: number
}
