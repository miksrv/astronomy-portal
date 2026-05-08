<?php

use App\Entities\ObservatoryEquipmentEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ObservatoryEquipmentEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testIdCastToInt(): void
    {
        $entity     = new ObservatoryEquipmentEntity();
        $entity->id = '3';
        $this->assertSame(3, $entity->id);
        $this->assertIsInt($entity->id);
    }

    public function testEquipmentTypeCastToString(): void
    {
        $entity                   = new ObservatoryEquipmentEntity();
        $entity->equipment_type   = 'telescope';
        $this->assertSame('telescope', $entity->equipment_type);
        $this->assertIsString($entity->equipment_type);
    }

    public function testBrandCastToString(): void
    {
        $entity        = new ObservatoryEquipmentEntity();
        $entity->brand = 'Celestron';
        $this->assertSame('Celestron', $entity->brand);
        $this->assertIsString($entity->brand);
    }

    public function testModelCastToString(): void
    {
        $entity        = new ObservatoryEquipmentEntity();
        $entity->model = 'C11';
        $this->assertSame('C11', $entity->model);
        $this->assertIsString($entity->model);
    }

    // --- Datamap aliases ---

    public function testTypeDatamapAliasWritesToEquipmentType(): void
    {
        $entity       = new ObservatoryEquipmentEntity();
        $entity->type = 'camera';
        $this->assertSame('camera', $entity->equipment_type);
    }

    public function testTypeDatamapAliasReadsFromEquipmentType(): void
    {
        $entity                 = new ObservatoryEquipmentEntity();
        $entity->equipment_type = 'mount';
        $this->assertSame('mount', $entity->type);
    }

    // --- Default attribute values ---

    public function testNewInstanceIdDefaultsToZero(): void
    {
        // 'id' cast to 'int'; CI4 Entity converts null attribute to 0 on get
        $entity = new ObservatoryEquipmentEntity();
        $this->assertSame(0, $entity->id);
    }

    public function testNewInstanceBrandDefaultsToEmptyString(): void
    {
        // 'brand' cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new ObservatoryEquipmentEntity();
        $this->assertSame('', $entity->brand);
    }
}
