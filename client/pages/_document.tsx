import { Head, Html, Main, NextScript } from 'next/document'
import Script from 'next/script'
import React from 'react'

export default function Document() {
    return (
        <Html lang='en'>
            <Head>
                <Script
                    src='/scripts/d3.min.js'
                    strategy='beforeInteractive'
                />
                <Script
                    src='/scripts/d3.geo.projection.min.js'
                    strategy='beforeInteractive'
                />
                <Script
                    src='/scripts/celestial.min.js'
                    strategy='beforeInteractive'
                />
            </Head>
            <body>
                <div
                    dangerouslySetInnerHTML={{
                        __html: '<!-- Yandex.Metrika counter --> <script type="text/javascript" > (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)}; m[i].l=1*new Date(); for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }} k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)}) (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym"); ym(93471741, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true }); </script> <noscript><div><img src="https://mc.yandex.ru/watch/93471741" style="position:absolute; left:-9999px;" alt="" /></div></noscript> <!-- /Yandex.Metrika counter --><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-BGBKSHELMF"></script><script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config", "G-BGBKSHELMF");</script>'
                    }}
                />
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
