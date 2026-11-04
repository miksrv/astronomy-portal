<?php

use App\Libraries\CatalogLibrary;
use CodeIgniter\Test\CIUnitTestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * CatalogLibrary: designation normalisation (must agree with the observatory pipeline for the
 * names our archive uses) and OpenNGC row parsing.
 *
 * @internal
 */
final class CatalogLibraryTest extends CIUnitTestCase
{
    public static function names(): array
    {
        return [
            ['M 31', 'M31'], ['m_31', 'M31'], ['M_1', 'M1'], ['NGC0224', 'NGC224'], ['NGC_7000', 'NGC7000'],
            ['ngc 70', 'NGC70'], ['IC_1318B', 'IC1318B'], ['IC0434', 'IC434'], ['Sh2-155', 'SH2-155'],
            ['Sh2_103', 'SH2-103'], ['SH 2-155', 'SH2-155'], ['ESO056-115', 'ESO56-115'], ['Mel022', 'MEL22'],
            ['PGC_54559', 'PGC54559'], ['UGC_6930', 'UGC6930'], ['HCG_68', 'HCG68'], ['C009', 'C9'],
        ];
    }

    #[DataProvider('names')]
    public function testNormalize(string $name, string $expected): void
    {
        $this->assertSame($expected, CatalogLibrary::normalize($name));
    }

    public function testNotDesignations(): void
    {
        foreach (['', 'Andromeda Galaxy', 'C_2020_R4_ATLAS', 'T_CrB', '40_Eri', 'Vesta_A807_FA', 'M_300', '2023ixf', 'C_200'] as $name) {
            $this->assertNull(CatalogLibrary::normalize($name), $name);
        }
    }

    public function testCoordinates(): void
    {
        $this->assertEqualsWithDelta(83.8187, CatalogLibrary::parseRa('05:35:16.48'), 1e-4);
        $this->assertEqualsWithDelta(-5.3897, CatalogLibrary::parseDec('-05:23:22.8'), 1e-4);
        $this->assertEqualsWithDelta(41.2691, CatalogLibrary::parseDec('+41:16:08.6'), 1e-4);
        $this->assertNull(CatalogLibrary::parseRa(''));
    }

    private function row(): array
    {
        $csv = "Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;B-Mag;V-Mag;J-Mag;H-Mag;K-Mag;SurfBr;Hubble;Pax;Pm-RA;Pm-Dec;RadVel;Redshift;Cstar U-Mag;Cstar B-Mag;Cstar V-Mag;M;NGC;IC;Cstar Names;Identifiers;Common names;NED notes;OpenNGC notes;Sources\n"
            . "NGC0224;G;00:42:44.35;+41:16:08.6;And;177.83;69.66;35;4.29;3.44;2.09;1.28;0.98;23.63;Sb;;;;-300;-0.001000;;;;031;;;;2MASX J00424433+4116074,IRAS 00400+4059,MCG +07-02-016,PGC 002557,UGC 00454;Andromeda Galaxy;;;Type:1\n"
            . "M102;Dup;;;;;;;;;;;;;;;;;;;;;;101;;;;;;;;\n";

        return CatalogLibrary::parseCsv($csv);
    }

    public function testCatalogRow(): void
    {
        [$andromeda] = $this->row();
        $row = CatalogLibrary::toCatalogRow($andromeda);

        $this->assertSame('NGC224', $row['designation']);
        $this->assertSame(31, $row['messier']);
        $this->assertSame(3.44, $row['mag_v']);
        $this->assertSame('And', $row['constellation']);
        $this->assertEqualsWithDelta(10.6848, $row['ra'], 1e-4);
    }

    public function testAliases(): void
    {
        [$andromeda, $duplicate] = $this->row();

        $this->assertSame(['NGC224', 'M31', 'PGC2557', 'UGC454'], CatalogLibrary::aliasesOf($andromeda));
        $this->assertFalse(CatalogLibrary::isObject($duplicate));
        $this->assertSame(['M102', 'M101'], CatalogLibrary::duplicateOf($duplicate));
    }
}
