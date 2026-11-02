import { ApiModel } from '@/api'

/** The order the setup is read in: what made the picture first, the accessories after */
export const TYPE_ORDER: ApiModel.EquipmentType[] = [
    ApiModel.EquipmentType.Scope,
    ApiModel.EquipmentType.Camera,
    ApiModel.EquipmentType.Mount,
    ApiModel.EquipmentType.Filter,
    ApiModel.EquipmentType.FilterWheel,
    ApiModel.EquipmentType.Focuser,
    ApiModel.EquipmentType.GuidingScope,
    ApiModel.EquipmentType.GuidingCamera
]

/** The parts that made the picture; the rest of the setup is folded under "more" */
export const MAIN_TYPES: ApiModel.EquipmentType[] = [
    ApiModel.EquipmentType.Scope,
    ApiModel.EquipmentType.Camera,
    ApiModel.EquipmentType.Mount
]
