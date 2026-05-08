<?php

use App\Entities\CategoryEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class CategoryEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testIdCastToInt(): void
    {
        $entity     = new CategoryEntity();
        $entity->id = '5';
        $this->assertSame(5, $entity->id);
        $this->assertIsInt($entity->id);
    }

    public function testTitleEnCastToString(): void
    {
        $entity           = new CategoryEntity();
        $entity->title_en = 'Nebulae';
        $this->assertSame('Nebulae', $entity->title_en);
        $this->assertIsString($entity->title_en);
    }

    public function testTitleRuCastToString(): void
    {
        $entity           = new CategoryEntity();
        $entity->title_ru = 'Туманности';
        $this->assertSame('Туманности', $entity->title_ru);
        $this->assertIsString($entity->title_ru);
    }

    public function testDescriptionEnCastToString(): void
    {
        $entity                  = new CategoryEntity();
        $entity->description_en  = 'Interstellar clouds';
        $this->assertSame('Interstellar clouds', $entity->description_en);
        $this->assertIsString($entity->description_en);
    }

    public function testDescriptionRuCastToString(): void
    {
        $entity                  = new CategoryEntity();
        $entity->description_ru  = 'Межзвёздные облака';
        $this->assertSame('Межзвёздные облака', $entity->description_ru);
        $this->assertIsString($entity->description_ru);
    }

    // --- Default attribute values ---

    public function testNewInstanceIdDefaultsToZero(): void
    {
        // 'id' cast to 'int'; CI4 Entity converts null attribute to 0 on get
        $entity = new CategoryEntity();
        $this->assertSame(0, $entity->id);
    }

    public function testNewInstanceTitleEnDefaultsToEmptyString(): void
    {
        // 'title_en' cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new CategoryEntity();
        $this->assertSame('', $entity->title_en);
    }
}
