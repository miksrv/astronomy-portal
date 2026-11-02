<?php

use App\Libraries\AstrometryClient;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tests the FITS header parser the plate solve's WCS goes through. No network, no database.
 *
 * @internal
 */
final class AstrometryClientTest extends CIUnitTestCase
{
    /** Builds a FITS header from `KEY = value` lines: 80-character cards, an END card */
    private function header(array $cards): string
    {
        $fits = '';

        foreach ($cards as $card) {
            $fits .= str_pad($card, 80);
        }

        return $fits . str_pad('END', 80);
    }

    private function tanSipHeader(): string
    {
        return $this->header([
            'SIMPLE  =                    T / Standard FITS file',
            "CTYPE1  = 'RA---TAN-SIP' / TAN (gnomic) projection + SIP distortions",
            'CRVAL1  =        37.7022322706 / RA  of reference point',
            'CRVAL2  =        61.0562251335 / DEC of reference point',
            'CRPIX1  =        497.660312653 / X reference pixel',
            'CRPIX2  =         268.49524498 / Y reference pixel',
            'CD1_1   =    0.000216231053277 / Transformation matrix',
            'CD1_2   =   -8.22645509058E-05 / no comment',
            'CD2_1   =    8.20437815268E-05 / no comment',
            'CD2_2   =    0.000216235548847 / no comment',
            'IMAGEW  =                 4096 / Image width,  in pixels.',
            'IMAGEH  =                 3160 / Image height, in pixels.',
            'A_ORDER =                    2 / Polynomial order, axis 1',
            'A_0_2   =   -4.70588434376E-08 / no comment',
            'A_1_1   =    2.07627673606E-07 / no comment',
            'A_2_0   =                    0 / no comment',
            'B_ORDER =                    2 / Polynomial order, axis 2',
            'B_0_2   =    4.17411413802E-08 / no comment',
            'AP_ORDER=                    2 / Inv polynomial order, axis 1',
            'AP_0_0  =    6.89251917025E-05 / no comment',
            'BP_ORDER=                    2 / Inv polynomial order, axis 2',
            'BP_1_0  =   -1.76261141916E-07 / no comment',
            "DATE    = '2026-11-02T18:21:45' / Date this file was created.",
        ]);
    }

    public function testParsesReferencePointAndMatrix(): void
    {
        $wcs = AstrometryClient::parseWcsHeader($this->tanSipHeader());

        $this->assertEqualsWithDelta(37.7022322706, $wcs['crval'][0], 1e-9);
        $this->assertEqualsWithDelta(61.0562251335, $wcs['crval'][1], 1e-9);
        $this->assertEqualsWithDelta(497.660312653, $wcs['crpix'][0], 1e-9);
        $this->assertEqualsWithDelta(268.49524498, $wcs['crpix'][1], 1e-9);
        $this->assertEqualsWithDelta(0.000216231053277, $wcs['cd'][0][0], 1e-15);
        $this->assertEqualsWithDelta(-8.22645509058E-05, $wcs['cd'][0][1], 1e-15);
        $this->assertEqualsWithDelta(8.20437815268E-05, $wcs['cd'][1][0], 1e-15);
        $this->assertEqualsWithDelta(0.000216235548847, $wcs['cd'][1][1], 1e-15);
    }

    public function testParsesImageSizeAsIntegers(): void
    {
        $wcs = AstrometryClient::parseWcsHeader($this->tanSipHeader());

        $this->assertSame(4096, $wcs['width']);
        $this->assertSame(3160, $wcs['height']);
    }

    public function testParsesSipPolynomialsSkippingZeroTerms(): void
    {
        $wcs = AstrometryClient::parseWcsHeader($this->tanSipHeader());

        $this->assertSame([[0, 2, -4.70588434376E-08], [1, 1, 2.07627673606E-07]], $wcs['sip']['a']);
        $this->assertSame([[0, 2, 4.17411413802E-08]], $wcs['sip']['b']);
        $this->assertSame([[0, 0, 6.89251917025E-05]], $wcs['sip']['ap']);
        $this->assertSame([[1, 0, -1.76261141916E-07]], $wcs['sip']['bp']);
    }

    public function testHeaderWithoutSipHasNoDistortion(): void
    {
        $wcs = AstrometryClient::parseWcsHeader($this->header([
            'CRVAL1  =                 10.0',
            'CRVAL2  =                 20.0',
            'CRPIX1  =                100.0',
            'CRPIX2  =                200.0',
            'CD1_1   =                0.001',
            'CD1_2   =                  0.0',
            'CD2_1   =                  0.0',
            'CD2_2   =                0.001',
        ]));

        $this->assertNull($wcs['sip']);
        $this->assertSame(0, $wcs['width']);
    }

    public function testStopsAtEndCardAndRequiresTheReferencePoint(): void
    {
        $this->expectException(RuntimeException::class);

        // CRVAL2 comes after END, so it must not be read
        AstrometryClient::parseWcsHeader($this->header(['CRVAL1  = 10.0']) . str_pad('CRVAL2  = 20.0', 80));
    }
}
