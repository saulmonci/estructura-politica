<?php

namespace Tests\Unit;

use App\Support\PhoneNumberNormalizer;
use PHPUnit\Framework\TestCase;

class PhoneNumberNormalizerTest extends TestCase
{
    public function test_normalizes_standard_10_digit_mexican_phone(): void
    {
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('3221234567'));
    }

    public function test_normalizes_phone_with_country_code_52(): void
    {
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('523221234567'));
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('+523221234567'));
    }

    public function test_normalizes_phone_with_legacy_mobile_code_521(): void
    {
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('5213221234567'));
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('+5213221234567'));
    }

    public function test_normalizes_formatted_phone_with_spaces_and_dashes(): void
    {
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('(322) 123-4567'));
        $this->assertEquals('3221234567', PhoneNumberNormalizer::toNational10('+52 (322) 123 4567'));
    }

    public function test_returns_null_for_invalid_or_short_numbers(): void
    {
        $this->assertNull(PhoneNumberNormalizer::toNational10(null));
        $this->assertNull(PhoneNumberNormalizer::toNational10(''));
        $this->assertNull(PhoneNumberNormalizer::toNational10('12345'));
        $this->assertNull(PhoneNumberNormalizer::toNational10('abcdefghij'));
    }

    public function test_is_valid_helper(): void
    {
        $this->assertTrue(PhoneNumberNormalizer::isValid('3221234567'));
        $this->assertTrue(PhoneNumberNormalizer::isValid('+52 1 322 123 4567'));
        $this->assertFalse(PhoneNumberNormalizer::isValid('12345'));
        $this->assertFalse(PhoneNumberNormalizer::isValid(null));
    }

    public function test_to_e164_mexico_format(): void
    {
        $this->assertEquals('+523221234567', PhoneNumberNormalizer::toE164Mexico('3221234567'));
        $this->assertEquals('+523221234567', PhoneNumberNormalizer::toE164Mexico('+5213221234567'));
        $this->assertNull(PhoneNumberNormalizer::toE164Mexico('123'));
    }

    public function test_to_evolution_format(): void
    {
        $this->assertEquals('523221234567', PhoneNumberNormalizer::toEvolutionFormat('3221234567'));
        $this->assertEquals('523221234567', PhoneNumberNormalizer::toEvolutionFormat('+52 1 322 123 4567'));
        $this->assertEquals('523221234567', PhoneNumberNormalizer::toEvolutionFormat('5213221234567'));
        $this->assertEquals('523221234567', PhoneNumberNormalizer::toEvolutionFormat('(322) 123-4567'));
        $this->assertNull(PhoneNumberNormalizer::toEvolutionFormat('12345'));
        $this->assertNull(PhoneNumberNormalizer::toEvolutionFormat(null));
    }
}
