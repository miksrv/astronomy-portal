<!doctype html>
<html lang="<?= $locale ?? 'ru' ?>">
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
        }

        p {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: normal;
            margin: 0 0 16px;
            color: #24292f;
        }

        a {
            color: #3b82f6;
            text-decoration: underline;
        }

        /* LAYOUT */
        .body {
            background-color: #f6f8fa;
            width: 100%;
        }

        .container {
            margin: 0 auto !important;
            max-width: 600px;
            padding: 32px 0 0;
            width: 600px;
        }

        .content {
            box-sizing: border-box;
            display: block;
            margin: 0 auto;
            max-width: 600px;
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

        /* INLINE IMAGE */
        .newsletter-image {
            border-radius: 8px;
            display: block;
            margin-bottom: 24px;
            max-width: 100%;
            width: 100%;
        }

        /* BUTTON */
        .btn {
            box-sizing: border-box;
            min-width: 100% !important;
            width: 100%;
        }

        .btn > tbody > tr > td {
            padding-bottom: 16px;
            padding-top: 8px;
        }

        .btn table {
            width: auto;
        }

        .btn table td {
            background-color: #ffffff;
            border-radius: 8px;
            text-align: center;
        }

        .btn-primary table td {
            background-color: #3b82f6;
        }

        .btn-primary a {
            background-color: #3b82f6;
            border: solid 1px #3b82f6;
            border-radius: 8px;
            box-sizing: border-box;
            color: #ffffff;
            cursor: pointer;
            display: inline-block;
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            padding: 14px 28px;
            text-decoration: none;
        }

        /* FOOTER */
        .footer {
            background-color: transparent;
            border-radius: 0 0 8px 8px;
            clear: both;
            padding: 24px;
            text-align: center;
            width: 100%;
        }

        .footer td,
        .footer p,
        .footer span,
        .footer a {
            color: #656d76;
            font-size: 12px;
            text-align: center;
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
            .apple-link a {
                color: inherit !important;
                font-family: inherit !important;
                font-size: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
                text-decoration: none !important;
            }
            #MessageViewBody a {
                color: inherit;
                text-decoration: none;
                font-size: inherit;
                font-family: inherit;
                font-weight: inherit;
                line-height: inherit;
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
            .content {
                padding: 0 !important;
            }
            .container {
                padding: 8px 0 0 !important;
                width: 100% !important;
            }
            .footer {
                border-radius: 0 !important;
            }
            .newsletter-image {
                border-radius: 0 !important;
            }
            .btn table {
                max-width: 100% !important;
                width: 100% !important;
            }
            .btn a {
                font-size: 16px !important;
                max-width: 100% !important;
                width: 100% !important;
            }
        }
    </style>
</head>
<body>

<!--[if mso]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center">
<tr><td>
<![endif]-->

<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
    <tr>
        <td>&nbsp;</td>
        <td class="container">
            <div class="content">

                <!-- PREHEADER (invisible preview text) -->
                <span class="preheader"><?= htmlspecialchars($subject ?? '', ENT_QUOTES, 'UTF-8') ?></span>

                <!-- MAIN CONTENT -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main">
                    <tr>
                        <td class="wrapper">

                            <!-- Optional inline image -->
                            <?php if (!empty($imageUrl)): ?>
                            <img src="<?= htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') ?>"
                                 alt=""
                                 class="newsletter-image"
                                 style="border-radius: 8px; display: block; margin-bottom: 24px; max-width: 100%; width: 100%;">
                            <?php endif; ?>

                            <!-- Main content body provided by admin -->
                            <?= nl2br(htmlspecialchars($content ?? '', ENT_QUOTES, 'UTF-8')) ?>

                            <!-- Optional CTA button -->
                            <?php if (!empty($actionText) && !empty($actionLink)): ?>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
                                <tbody>
                                <tr>
                                    <td align="center" style="padding-top: 8px; padding-bottom: 16px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                            <tbody>
                                            <tr>
                                                <td style="background-color: #3b82f6; border-radius: 8px; text-align: center;">
                                                    <a href="<?= htmlspecialchars($actionLink, ENT_QUOTES, 'UTF-8') ?>"
                                                       target="_blank"
                                                       style="background-color: #3b82f6; border: solid 1px #3b82f6; border-radius: 8px; box-sizing: border-box; color: #ffffff; cursor: pointer; display: inline-block; font-size: 16px; font-weight: bold; margin: 0; padding: 14px 28px; text-decoration: none; font-family: Helvetica, Arial, sans-serif;">
                                                        <?= htmlspecialchars($actionText, ENT_QUOTES, 'UTF-8') ?>
                                                    </a>
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                            <?php endif; ?>

                        </td>
                    </tr>
                </table>

                <!-- FOOTER -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="footer">
                    <tr>
                        <td style="border-radius: 0 0 8px 8px; padding: 24px; text-align: center;">
                            <p style="color: #656d76; font-size: 12px; margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif;">
                                <a href="https://astro.miksoft.pro" target="_blank" style="color: #3b82f6; text-decoration: underline; font-family: Helvetica, Arial, sans-serif;">смотриназвезды.рф</a>
                                &nbsp;&bull;&nbsp;
                                <span style="color: #656d76;">51.7&deg;N, 55.0&deg;E</span>
                            </p>
                            <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 12px 0;">
                            <p style="color: #656d76; font-size: 12px; margin: 0; font-family: Helvetica, Arial, sans-serif;">
                                <a href="<?= htmlspecialchars($unsubscribeUrl ?? '#', ENT_QUOTES, 'UTF-8') ?>"
                                   style="color: #3b82f6; text-decoration: underline; font-family: Helvetica, Arial, sans-serif;">Отписаться от рассылки</a>
                            </p>
                        </td>
                    </tr>
                </table>

            </div>
        </td>
        <td>&nbsp;</td>
    </tr>
</table>

<!--[if mso]>
</td></tr></table>
<![endif]-->

</body>
</html>
