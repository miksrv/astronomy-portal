<?php

use App\Libraries\ObjectSimbadLibrary;
use App\Libraries\SimbadClient;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * SIMBAD lookup without the network: our names as Sesame understands them, the Sesame and TAP
 * answers, the aliases worth keeping, and what gets stored for an object.
 *
 * @internal
 */
final class SimbadTest extends CIUnitTestCase
{
    private const SESAME_M33 = <<<'XML'
        <?xml version="1.0" encoding="UTF-8"?>
        <Sesame>
        <Target option="S">
          <name>M 33</name>
          <Resolver name="Sc=Simbad (CDS, via client/server)">
            <otype>GiG</otype>
            <jradeg>23.46206906</jradeg>
            <jdedeg>30.66017511</jdedeg>
            <oname>M  33</oname>
            <alias>M 33</alias>
            <alias>2E 409</alias>
            <alias>LEDA 5818</alias>
            <alias>2MASX J01335090+3039357</alias>
            <alias>NAME Triangulum Galaxy</alias>
            <alias>NGC 598</alias>
            <alias>UGC 1117</alias>
            <alias>[M98c] 013101.7+302415</alias>
          </Resolver>
        </Target>
        </Sesame>
        XML;

    private const SESAME_NOTHING = <<<'XML'
        <?xml version="1.0" encoding="UTF-8"?>
        <Sesame>
        <Target option="S">
          <name>Fooobject123</name>
          <INFO> *** NNNothing found *** </INFO>
        </Target>
        </Sesame>
        XML;

    public function testQueryName(): void
    {
        $this->assertSame('M 33', SimbadClient::queryName('M_33'));
        $this->assertSame('NGC 7000', SimbadClient::queryName('NGC_7000'));
        $this->assertSame('Sh 2-103', SimbadClient::queryName('Sh2_103'));
        $this->assertSame('Sh 2-155', SimbadClient::queryName('Sh2-155'));
        $this->assertSame('SN 2023ixf', SimbadClient::queryName('2023ixf'));
        $this->assertSame('Haumea', SimbadClient::queryName('Haumea_(2003_EL61)'));
        $this->assertSame('IC 1318B', SimbadClient::queryName('IC_1318B'));
    }

    public function testParseSesame(): void
    {
        $result = SimbadClient::parseSesame(self::SESAME_M33);

        $this->assertSame('M  33', $result['simbadId']);
        $this->assertSame('GiG', $result['type']);
        $this->assertEqualsWithDelta(23.462, $result['ra'], 1e-3);
        $this->assertEqualsWithDelta(30.660, $result['dec'], 1e-3);
        $this->assertSame(['M 33', 'LEDA 5818', 'Triangulum Galaxy', 'NGC 598', 'UGC 1117'], $result['aliases']);
    }

    public function testParseSesameNothingFound(): void
    {
        $this->assertNull(SimbadClient::parseSesame(self::SESAME_NOTHING));
    }

    public function testParseSesameNotXml(): void
    {
        $this->expectException(RuntimeException::class);

        SimbadClient::parseSesame('<html>Service unavailable');
    }

    public function testParseTap(): void
    {
        $json = json_encode(['metadata' => [], 'data' => [['GiG', 60.26, 35.48, 5.72]]]);

        $this->assertSame(['type' => 'GiG', 'majAxis' => 60.26, 'minAxis' => 35.48, 'magnitude' => 5.72], SimbadClient::parseTap($json));

        $nebula = json_encode(['data' => [['HII', null, null, null]]]);

        $this->assertSame(['type' => 'HII', 'majAxis' => null, 'minAxis' => null, 'magnitude' => null], SimbadClient::parseTap($nebula));
        $this->assertNull(SimbadClient::parseTap(json_encode(['data' => []])));
    }

    public function testAlias(): void
    {
        $this->assertSame('Sh 2-103', SimbadClient::alias('SH 2-103'));
        $this->assertSame('Cygnus Loop', SimbadClient::alias('NAME Cygnus Loop'));
        $this->assertSame('PN A66 74', SimbadClient::alias('PN A66 74'));
        $this->assertNull(SimbadClient::alias('PN G084.9-03.4'));
        $this->assertNull(SimbadClient::alias('SNR G074.0-08.6'));
        $this->assertNull(SimbadClient::alias('2MASX J01335090+3039357'));
    }

    public function testDistance(): void
    {
        $this->assertEqualsWithDelta(0.0, SimbadClient::distance(10, 20, 10, 20), 1e-9);
        $this->assertEqualsWithDelta(1.0, SimbadClient::distance(359.5, 0, 0.5, 0), 1e-6);
        $this->assertEqualsWithDelta(90.0, SimbadClient::distance(0, 0, 0, 90), 1e-6);
    }

    private function simbad(array $override = []): array
    {
        return $override + [
            'simbadId'  => 'M 94',
            'ra'        => 192.7211,
            'dec'       => 41.1203,
            'type'      => 'SyG',
            'majAxis'   => 11.2,
            'minAxis'   => 9.1,
            'magnitude' => 8.2,
            'aliases'   => ['M 94', 'NGC 4736'],
        ];
    }

    public function testMatchKeepsOurCoordinatesAndMagnitude(): void
    {
        $result = ObjectSimbadLibrary::decide(
            ['catalog_name' => 'M_94', 'ra' => 192.5, 'dec' => 41.5, 'magnitude' => 8.9],
            $this->simbad(),
            false,
            '2026-11-04 12:00:00'
        );

        $this->assertSame('match', $result['status']);
        $this->assertSame('SyG', $result['update']['object_type']);
        $this->assertSame('["M 94","NGC 4736"]', $result['update']['aliases']);
        $this->assertArrayNotHasKey('ra', $result['update']);
        $this->assertArrayNotHasKey('magnitude', $result['update']);
    }

    public function testMatchFillsAnEmptyMagnitude(): void
    {
        $result = ObjectSimbadLibrary::decide(['ra' => 192.7, 'dec' => 41.1, 'magnitude' => null], $this->simbad(), false, 'now');

        $this->assertSame(8.2, $result['update']['magnitude']);
    }

    public function testNoMagnitudeOfAPlanetaryNebulasCentralStar(): void
    {
        $result = ObjectSimbadLibrary::decide(['ra' => 299.9, 'dec' => 22.72], $this->simbad(['ra' => 299.9, 'dec' => 22.72, 'type' => 'PN', 'magnitude' => 14.09]), false, 'now');

        $this->assertArrayNotHasKey('magnitude', $result['update']);
    }

    public function testFarIsNotStoredUnlessAccepted(): void
    {
        // M 94 with its RA entered in hours
        $object = ['ra' => 12.8339, 'dec' => 41.12, 'magnitude' => null];

        $far = ObjectSimbadLibrary::decide($object, $this->simbad(), false, 'now');

        $this->assertSame('far', $far['status']);
        $this->assertSame([], $far['update']);

        $accepted = ObjectSimbadLibrary::decide($object, $this->simbad(), true, 'now');

        $this->assertSame(192.7211, $accepted['update']['ra']);
        $this->assertSame(41.1203, $accepted['update']['dec']);
    }

    public function testNoPositionTakesSimbads(): void
    {
        $result = ObjectSimbadLibrary::decide(['ra' => 0, 'dec' => 0], $this->simbad(), false, 'now');

        $this->assertSame('match', $result['status']);
        $this->assertNull($result['offset']);
        $this->assertSame(192.7211, $result['update']['ra']);
    }

    public function testMovingObjectsAreNotLookedUp(): void
    {
        $client = $this->createMock(SimbadClient::class);
        $client->expects($this->never())->method('lookup');

        $result = (new ObjectSimbadLibrary($client))->check(['catalog_name' => 'C_2020_R4_ATLAS'], [1, 8]);

        $this->assertSame('moving', $result['status']);
    }

    public function testFactsSavedFromTheForm(): void
    {
        $columns = ObjectSimbadLibrary::columnsFromForm(
            ['simbadId' => 'M 51', 'type' => 'Sy2', 'majAxis' => 9, 'minAxis' => '7.8', 'aliases' => ['M 51', 'NGC 5194', 42]],
            'now'
        );

        $this->assertSame('M 51', $columns['simbad_id']);
        $this->assertSame(7.8, $columns['min_axis']);
        $this->assertSame('["M 51","NGC 5194"]', $columns['aliases']);
        $this->assertNull(ObjectSimbadLibrary::columnsFromForm(['type' => 'G'], 'now'));
        $this->assertNull(ObjectSimbadLibrary::columnsFromForm(null, 'now'));
    }

    public function testOwnMagnitude(): void
    {
        $this->assertSame(8.4, ObjectSimbadLibrary::ownMagnitude('Sy2', 8.4));
        $this->assertNull(ObjectSimbadLibrary::ownMagnitude('PN', 14.1));
        $this->assertNull(ObjectSimbadLibrary::ownMagnitude('G', null));
    }
}
