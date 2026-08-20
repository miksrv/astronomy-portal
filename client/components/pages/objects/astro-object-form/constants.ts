// RA/DEC are stored in degrees (see `utils/coordinates.ts`), so RA is validated
// against a full 0-360 turn and DEC against the -90..90 range of a sphere.
export const RA_MIN = 0
export const RA_MAX = 360
export const DEC_MIN = -90
export const DEC_MAX = 90
