<?php

use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class FiltersHelperTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        helper('filters');
    }

    // --- mappingFilters() tests ---

    public function testMappingFiltersLuminanceLowercaseReturnsL(): void
    {
        $this->assertSame('L', mappingFilters('luminance'));
    }

    public function testMappingFiltersLSingleCharReturnsL(): void
    {
        $this->assertSame('L', mappingFilters('l'));
    }

    public function testMappingFiltersLuminanceMixedCaseReturnsL(): void
    {
        $this->assertSame('L', mappingFilters('Luminance'));
    }

    public function testMappingFiltersRedReturnsR(): void
    {
        $this->assertSame('R', mappingFilters('red'));
    }

    public function testMappingFiltersRSingleCharReturnsR(): void
    {
        $this->assertSame('R', mappingFilters('r'));
    }

    public function testMappingFiltersGreenReturnsG(): void
    {
        $this->assertSame('G', mappingFilters('green'));
    }

    public function testMappingFiltersGSingleCharReturnsG(): void
    {
        $this->assertSame('G', mappingFilters('g'));
    }

    public function testMappingFiltersBlueReturnsB(): void
    {
        $this->assertSame('B', mappingFilters('blue'));
    }

    public function testMappingFiltersBSingleCharReturnsB(): void
    {
        $this->assertSame('B', mappingFilters('b'));
    }

    public function testMappingFiltersHaReturnsH(): void
    {
        $this->assertSame('H', mappingFilters('ha'));
    }

    public function testMappingFiltersHSingleCharReturnsH(): void
    {
        $this->assertSame('H', mappingFilters('h'));
    }

    public function testMappingFiltersHaMixedCaseReturnsH(): void
    {
        $this->assertSame('H', mappingFilters('HA'));
    }

    public function testMappingFiltersOiiiReturnsO(): void
    {
        $this->assertSame('O', mappingFilters('oiii'));
    }

    public function testMappingFiltersOSingleCharReturnsO(): void
    {
        $this->assertSame('O', mappingFilters('o'));
    }

    public function testMappingFiltersSiiReturnsS(): void
    {
        $this->assertSame('S', mappingFilters('sii'));
    }

    public function testMappingFiltersSSingleCharReturnsS(): void
    {
        $this->assertSame('S', mappingFilters('s'));
    }

    public function testMappingFiltersUnknownReturnsN(): void
    {
        $this->assertSame('N', mappingFilters('unknown'));
    }

    public function testMappingFiltersEmptyStringReturnsN(): void
    {
        $this->assertSame('N', mappingFilters(''));
    }

    // --- prepareDataWithFilters() tests ---

    public function testPrepareDataWithFiltersEmptyDataReturnsEmptyArray(): void
    {
        $result = prepareDataWithFilters([], [], 'object_name', 'name');
        $this->assertSame([], $result);
    }

    public function testPrepareDataWithFiltersNonEmptyDataEmptyFiltersReturnsItemsUnchanged(): void
    {
        $item       = (object)['name' => 'M31', 'title' => 'Andromeda'];
        $data       = [$item];
        $result     = prepareDataWithFilters($data, [], 'object_name', 'name');

        $this->assertCount(1, $result);
        $this->assertFalse(isset($result[0]->filters));
        $this->assertFalse(isset($result[0]->statistic));
    }

    public function testPrepareDataWithFiltersMatchingFilterAddsFiltersAndStatistic(): void
    {
        $item   = (object)['name' => 'M31'];
        $filter = (object)[
            'object_name'  => 'M31',
            'filter'       => 'luminance',
            'frames_count' => 10,
            'exposure_time' => 600,
            'files_size'   => 1024,
        ];

        $result = prepareDataWithFilters([$item], [$filter], 'object_name', 'name');

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('luminance', $result[0]->filters);
        $this->assertSame(10, $result[0]->statistic['frames']);
        $this->assertSame(600, $result[0]->statistic['exposure']);
        $this->assertSame(1024, $result[0]->statistic['fileSize']);
    }

    public function testPrepareDataWithFiltersTwoMatchingFiltersSumsStatistics(): void
    {
        $item    = (object)['name' => 'M42'];
        $filter1 = (object)[
            'object_name'   => 'M42',
            'filter'        => 'luminance',
            'frames_count'  => 10,
            'exposure_time' => 300,
            'files_size'    => 512,
        ];
        $filter2 = (object)[
            'object_name'   => 'M42',
            'filter'        => 'red',
            'frames_count'  => 5,
            'exposure_time' => 150,
            'files_size'    => 256,
        ];

        $result = prepareDataWithFilters([$item], [$filter1, $filter2], 'object_name', 'name');

        $this->assertSame(15, $result[0]->statistic['frames']);
        $this->assertSame(450, $result[0]->statistic['exposure']);
        $this->assertSame(768, $result[0]->statistic['fileSize']);
        $this->assertArrayHasKey('luminance', $result[0]->filters);
        $this->assertArrayHasKey('red', $result[0]->filters);
    }

    public function testPrepareDataWithFiltersNoMatchingFilterLeavesItemUnchanged(): void
    {
        $item   = (object)['name' => 'NGC1234'];
        $filter = (object)[
            'object_name'   => 'M31',
            'filter'        => 'luminance',
            'frames_count'  => 10,
            'exposure_time' => 600,
            'files_size'    => 1024,
        ];

        $result = prepareDataWithFilters([$item], [$filter], 'object_name', 'name');

        $this->assertFalse(isset($result[0]->statistic));
    }

    // --- prepareObjectDataWithFilters() delegate test ---

    public function testPrepareObjectDataWithFiltersDelegatesWithCorrectKeys(): void
    {
        $item   = (object)['name' => 'M45'];
        $filter = (object)[
            'object_name'   => 'M45',
            'filter'        => 'blue',
            'frames_count'  => 8,
            'exposure_time' => 240,
            'files_size'    => 800,
        ];

        $result = prepareObjectDataWithFilters([$item], [$filter]);

        $this->assertSame(8, $result[0]->statistic['frames']);
    }

    // --- preparePhotoDataWithFilters() delegate test ---

    public function testPreparePhotoDataWithFiltersDelegatesWithCorrectKeys(): void
    {
        $item   = (object)['id' => 'photo-001'];
        $filter = (object)[
            'photo_id'      => 'photo-001',
            'filter'        => 'green',
            'frames_count'  => 20,
            'exposure_time' => 900,
            'files_size'    => 2048,
        ];

        $result = preparePhotoDataWithFilters([$item], [$filter]);

        $this->assertSame(20, $result[0]->statistic['frames']);
        $this->assertSame(900, $result[0]->statistic['exposure']);
    }
}
