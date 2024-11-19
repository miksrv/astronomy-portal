<?php

namespace App\Libraries;

use Config\Services;

class LocaleLibrary
{
    public function __construct()
    {
        $config  = config('App');
        $request = Services::request();
        $header  = $request->header('Locale');
        $locale  = $header ? $header->getValue() : $config->defaultLocale;

        $request->setLocale(in_array($locale, $config->supportedLocales) ? $locale : $config->defaultLocale);
    }
}