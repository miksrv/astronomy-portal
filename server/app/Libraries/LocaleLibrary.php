<?php

namespace App\Libraries;

use Config\Services;

class LocaleLibrary
{
    public function __construct()
    {
        self::init();
    }

    public static function init(): void
    {
        $config  = config('App');
        $request = Services::request();
        $header  = $request->header('Locale');
        $locale  = $header ? $header->getValue() : $config->defaultLocale;

        $request->setLocale(in_array($locale, $config->supportedLocales) ? $locale : $config->defaultLocale);
    }
}