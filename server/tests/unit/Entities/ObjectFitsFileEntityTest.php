<?php

use App\Entities\ObjectFitsFileEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ObjectFitsFileEntityTest extends CIUnitTestCase
{
    // --- Cast behavior (numeric) ---

    public function testFileSizeCastToFloat(): void
    {
        $entity            = new ObjectFitsFileEntity();
        $entity->file_size = '1048576.5';
        $this->assertIsFloat($entity->file_size);
        $this->assertSame(1048576.5, $entity->file_size);
    }

    public function testNaxis1CastToInt(): void
    {
        $entity         = new ObjectFitsFileEntity();
        $entity->naxis1 = '4096';
        $this->assertSame(4096, $entity->naxis1);
        $this->assertIsInt($entity->naxis1);
    }

    public function testNaxis2CastToInt(): void
    {
        $entity         = new ObjectFitsFileEntity();
        $entity->naxis2 = '2160';
        $this->assertSame(2160, $entity->naxis2);
        $this->assertIsInt($entity->naxis2);
    }

    public function testExptimeCastToInt(): void
    {
        $entity          = new ObjectFitsFileEntity();
        $entity->exptime = '300';
        $this->assertSame(300, $entity->exptime);
        $this->assertIsInt($entity->exptime);
    }

    public function testGainCastToInt(): void
    {
        $entity       = new ObjectFitsFileEntity();
        $entity->gain = '100';
        $this->assertSame(100, $entity->gain);
        $this->assertIsInt($entity->gain);
    }

    public function testRaCastToFloat(): void
    {
        $entity     = new ObjectFitsFileEntity();
        $entity->ra = '83.8221';
        $this->assertSame(83.8221, $entity->ra);
        $this->assertIsFloat($entity->ra);
    }

    public function testDecCastToFloat(): void
    {
        $entity      = new ObjectFitsFileEntity();
        $entity->dec = '-5.3911';
        $this->assertSame(-5.3911, $entity->dec);
        $this->assertIsFloat($entity->dec);
    }

    public function testHfrCastToFloat(): void
    {
        $entity      = new ObjectFitsFileEntity();
        $entity->hfr = '2.34';
        $this->assertIsFloat($entity->hfr);
    }

    public function testFwhmCastToFloat(): void
    {
        $entity       = new ObjectFitsFileEntity();
        $entity->fwhm = '3.12';
        $this->assertIsFloat($entity->fwhm);
    }

    public function testCcdTempCastToInt(): void
    {
        $entity           = new ObjectFitsFileEntity();
        $entity->ccd_temp = '-10';
        $this->assertSame(-10, $entity->ccd_temp);
        $this->assertIsInt($entity->ccd_temp);
    }

    // --- Datamap aliases ---

    public function testFileNameDatamapAlias(): void
    {
        $entity           = new ObjectFitsFileEntity();
        $entity->fileName = 'frame_001';
        $this->assertSame('frame_001', $entity->file_name);
    }

    public function testExposureDatamapAliasWritesToExptime(): void
    {
        $entity           = new ObjectFitsFileEntity();
        $entity->exposure = '600';
        $this->assertSame(600, $entity->exptime);
    }

    public function testCcdTempDatamapAlias(): void
    {
        $entity          = new ObjectFitsFileEntity();
        $entity->ccdTemp = '-15';
        $this->assertSame(-15, $entity->ccd_temp);
    }

    public function testDateDatamapAliasWritesToDateObs(): void
    {
        $entity       = new ObjectFitsFileEntity();
        $entity->date = '2024-03-15 22:00:00';
        $this->assertNotNull($entity->date_obs);
    }
}
