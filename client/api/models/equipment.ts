export enum EquipmentType {
    Mount = 'mount',
    Scope = 'scope',
    Camera = 'camera',
    GuidingCamera = 'guiding_camera',
    GuidingScope = 'guiding_scope',
    Focuser = 'focuser',
    FilterWheel = 'filter_wheel',
    Filter = 'filter'
}

export type Equipment = {
    id: number
    type?: EquipmentType
    brand?: string
    model?: string
    specifications?: string
}
