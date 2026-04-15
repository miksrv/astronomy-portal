<?php

use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class LocaleHelperTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        helper('locale');
    }

    public function testRuLocaleReturnsRussianString(): void
    {
        $this->assertSame('Russian', getLocalizedString('ru', 'English', 'Russian'));
    }

    public function testEnLocaleReturnsEnglishString(): void
    {
        $this->assertSame('English', getLocalizedString('en', 'English', 'Russian'));
    }

    public function testRuLocaleWithNullRuFallsBackToEn(): void
    {
        $this->assertSame('English', getLocalizedString('ru', 'English', null));
    }

    public function testEnLocaleWithNullEnFallsBackToRu(): void
    {
        $this->assertSame('Russian', getLocalizedString('en', null, 'Russian'));
    }

    public function testRuLocaleWithEmptyRuFallsBackToEn(): void
    {
        $this->assertSame('English', getLocalizedString('ru', 'English', ''));
    }

    public function testEnLocaleWithEmptyEnFallsBackToRu(): void
    {
        $this->assertSame('Russian', getLocalizedString('en', '', 'Russian'));
    }

    public function testRuLocaleWithBothNullReturnsEmptyString(): void
    {
        $this->assertSame('', getLocalizedString('ru', null, null));
    }

    public function testEnLocaleWithBothNullReturnsEmptyString(): void
    {
        $this->assertSame('', getLocalizedString('en', null, null));
    }
}
