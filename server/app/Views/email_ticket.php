<!doctype html>
<html lang="ru">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title><?= htmlspecialchars($subject ?? '', ENT_QUOTES, 'UTF-8') ?></title>
    <style media="all" type="text/css">
        /* BASE RESET */
        body {
            font-family: Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            font-size: 16px;
            line-height: 1.5;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
            background-color: #f6f8fa;
            margin: 0;
            padding: 0;
            text-align: left;
        }

        table {
            border-collapse: separate;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            width: 100%;
        }

        table td {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 16px;
            vertical-align: top;
            text-align: left;
        }

        h2 {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 22px;
            margin: 0 0 12px;
            color: #24292f;
            text-align: left;
        }

        p {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: normal;
            margin: 0 0 16px;
            color: #24292f;
            text-align: left;
        }

        ul {
            margin: 0 0 16px;
            padding-left: 20px;
            text-align: left;
        }

        li {
            margin: 0 0 8px;
            color: #24292f;
        }

        a {
            color: #3b82f6;
            text-decoration: underline;
        }

        /* LAYOUT — full width, no fixed max-width container */
        .body {
            background-color: #f6f8fa;
            width: 100%;
        }

        .container {
            margin: 0 auto !important;
            width: 100%;
            padding: 32px 0 0;
        }

        .content {
            box-sizing: border-box;
            display: block;
            margin: 0 auto;
            width: 100%;
            padding: 0;
        }

        /* PREHEADER */
        .preheader {
            color: transparent;
            display: none;
            height: 0;
            max-height: 0;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            mso-hide: all;
            visibility: hidden;
            width: 0;
        }

        /* MAIN CONTENT */
        .main {
            background: #ffffff;
            width: 100%;
        }

        .wrapper {
            box-sizing: border-box;
            padding: 24px;
        }

        /* TICKET IMAGE */
        .ticket-image {
            display: block;
            margin: 0 0 24px;
            max-width: 100%;
            width: 100%;
        }

        /* FOOTER */
        .footer {
            background-color: transparent;
            border-radius: 0 0 8px 8px;
            clear: both;
            padding: 24px;
            text-align: left;
            width: 100%;
        }

        .footer td,
        .footer p,
        .footer span,
        .footer a {
            color: #656d76;
            font-size: 12px;
            text-align: left;
        }

        .footer a {
            color: #3b82f6;
            text-decoration: underline;
        }

        /* EMAIL CLIENT FIXES */
        @media all {
            .ExternalClass {
                width: 100%;
            }
            .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
                line-height: 100%;
            }
        }

        /* RESPONSIVE */
        @media only screen and (max-width: 600px) {
            .main p,
            .main td,
            .main span {
                font-size: 16px !important;
            }
            .wrapper {
                padding: 16px !important;
            }
            .container {
                padding: 8px 0 0 !important;
            }
        }
    </style>
</head>
<body>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
    <tr>
        <td class="container">
            <div class="content">

                <!-- PREHEADER (invisible preview text) -->
                <span class="preheader"><?= htmlspecialchars($subject ?? '', ENT_QUOTES, 'UTF-8') ?></span>

                <!-- MAIN CONTENT -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main">
                    <tr>
                        <td class="wrapper">

                            <p>Спасибо за регистрацию на астровыезд, в этом письме вы найдёте основную информацию. Ваш билет с QR-кодом — ниже. Покажите его при входе на мероприятие.</p>

                            <h2><?= htmlspecialchars($eventTitle ?? '', ENT_QUOTES, 'UTF-8') ?></h2>

                            <?php if (!empty($dateTimeValue)): ?>
                            <p>Дата и время (Оренбургское время): <?= htmlspecialchars($dateTimeValue, ENT_QUOTES, 'UTF-8') ?></p>
                            <?php endif; ?>

                            <?php
                            $locationLine = trim(implode(', ', array_filter([$locationValue ?? '', $addressValue ?? ''])));
                            ?>
                            <?php if ($locationLine !== ''): ?>
                            <p>Локация: <?= htmlspecialchars($locationLine, ENT_QUOTES, 'UTF-8') ?></p>
                            <?php endif; ?>

                            <!-- Ticket with QR code -->
                            <img src="cid:COVER_IMAGE_CID" alt="<?= htmlspecialchars($eventTitle ?? '', ENT_QUOTES, 'UTF-8') ?>" class="ticket-image">

                            <?php if (!empty($yandexMapLink) || !empty($googleMapLink)): ?>
                            <p>Чтобы добраться до нас, воспользуйтесь ссылками на карты ниже:</p>
                            <ul>
                                <?php if (!empty($yandexMapLink)): ?>
                                <li><a href="<?= htmlspecialchars($yandexMapLink, ENT_QUOTES, 'UTF-8') ?>" target="_blank">Яндекс Карты</a></li>
                                <?php endif; ?>
                                <?php if (!empty($googleMapLink)): ?>
                                <li><a href="<?= htmlspecialchars($googleMapLink, ENT_QUOTES, 'UTF-8') ?>" target="_blank">Google Карты</a></li>
                                <?php endif; ?>
                            </ul>
                            <?php endif; ?>

                            <p>Полезно будет знать:</p>
                            <ul>
                                <li><a href="https://astro.miksoft.pro/stargazing/rules" target="_blank">Правила поведения на астровыездах</a></li>
                                <li><a href="https://astro.miksoft.pro/stargazing/howto" target="_blank">Как проходят астровыезды</a></li>
                                <li><a href="https://astro.miksoft.pro/stargazing/faq" target="_blank">Часто задаваемые вопросы</a></li>
                            </ul>

                            <p>Внимание! Мероприятие может быть перенесено из-за непогоды, следите за нашими анонсами в <a href="https://t.me/look_at_stars" target="_blank">Telegram-канале</a>.</p>

                        </td>
                    </tr>
                </table>

                <!-- FOOTER -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="footer">
                    <tr>
                        <td style="border-radius: 0 0 8px 8px; padding: 24px; text-align: left;">
                            <p style="color: #656d76; font-size: 12px; margin: 0; font-family: Helvetica, Arial, sans-serif; text-align: left;">
                                <a href="https://astro.miksoft.pro" target="_blank" style="color: #3b82f6; text-decoration: underline; font-family: Helvetica, Arial, sans-serif;">смотриназвезды.рф</a>
                            </p>
                        </td>
                    </tr>
                </table>

            </div>
        </td>
    </tr>
</table>

</body>
</html>
