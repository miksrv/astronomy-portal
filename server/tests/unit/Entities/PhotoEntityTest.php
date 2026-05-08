<?php

use App\Entities\PhotoEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PhotoEntityTest extends CIUnitTestCase
{
    // --- Default attribute values ---

    public function testNewInstanceStringAttributesDefaultToEmptyString(): void
    {
        // All string-cast fields return '' when the underlying attribute is null
        $entity = new PhotoEntity();
        $this->assertSame('', $entity->id);
        $this->assertSame('', $entity->dir_name);
        $this->assertSame('', $entity->file_name);
        $this->assertSame('', $entity->file_ext);
    }

    // --- Cast behavior ---

    public function testFileSizeCastToInteger(): void
    {
        $entity            = new PhotoEntity();
        $entity->file_size = '2048';
        $this->assertSame(2048, $entity->file_size);
        $this->assertIsInt($entity->file_size);
    }

    public function testImageWidthCastToInteger(): void
    {
        $entity              = new PhotoEntity();
        $entity->image_width = '1920';
        $this->assertSame(1920, $entity->image_width);
        $this->assertIsInt($entity->image_width);
    }

    public function testImageHeightCastToInteger(): void
    {
        $entity               = new PhotoEntity();
        $entity->image_height = '1080';
        $this->assertSame(1080, $entity->image_height);
        $this->assertIsInt($entity->image_height);
    }

    // --- Datamap aliases ---

    public function testDirNameDatamapAlias(): void
    {
        $entity          = new PhotoEntity();
        $entity->dirName = 'photos/2024';
        $this->assertSame('photos/2024', $entity->dir_name);
    }

    public function testFileNameDatamapAlias(): void
    {
        $entity           = new PhotoEntity();
        $entity->fileName = 'orion_nebula';
        $this->assertSame('orion_nebula', $entity->file_name);
    }

    public function testFileExtDatamapAlias(): void
    {
        $entity          = new PhotoEntity();
        $entity->fileExt = 'jpg';
        $this->assertSame('jpg', $entity->file_ext);
    }

    public function testFileSizeDatamapAliasAppliesIntCast(): void
    {
        $entity           = new PhotoEntity();
        $entity->fileSize = '4096';
        $this->assertSame(4096, $entity->file_size);
        $this->assertIsInt($entity->file_size);
    }

    public function testImageWidthDatamapAlias(): void
    {
        $entity             = new PhotoEntity();
        $entity->imageWidth = '3840';
        $this->assertSame(3840, $entity->image_width);
    }

    public function testImageHeightDatamapAlias(): void
    {
        $entity              = new PhotoEntity();
        $entity->imageHeight = '2160';
        $this->assertSame(2160, $entity->image_height);
    }
}
