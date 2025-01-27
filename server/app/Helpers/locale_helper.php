<?php

if (!function_exists('getLocalizedString')) {
   /**
    * Function to return localized text based on the current locale
    *
    * @param string $locale Current locale ('ru' or 'en')
    * @param string $titleEn Text in English
    * @param string $titleRu Text in Russian
    * @return string Localized text
    */
    function getLocalizedString(string $locale, ?string $titleEn, ?string $titleRu): string
    {
        return $locale === 'ru' 
            ? (!empty($titleRu) ? $titleRu : $titleEn)
            : (!empty($titleEn) ? $titleEn : $titleRu);
    }
}
