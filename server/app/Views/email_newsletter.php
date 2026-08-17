<?php
/**
 * Body content for a mailing campaign — rendered into the shared
 * `email_layout.php` shell (head/CSS, 600px container, brand footer).
 * Passing `unsubscribeUrl` turns on the footer's subscription-reason line.
 */
ob_start();
?>

<!-- Optional inline image -->
<?php if (!empty($imageUrl)): ?>
<img src="<?= htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') ?>"
     alt=""
     class="newsletter-image"
     style="border-radius: 8px; display: block; margin-bottom: 24px; max-width: 100%; width: 100%;">
<?php endif; ?>

<!-- Main content body provided by admin -->
<?= preg_replace(
    '/https?:\/\/[^\s<>"\']+/',
    '<a href="$0" target="_blank">$0</a>',
    nl2br(htmlspecialchars($content ?? '', ENT_QUOTES, 'UTF-8'))
) ?>

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

<?php
$renderedContent = ob_get_clean();

echo view('email_layout', [
    'subject'        => $subject ?? '',
    'locale'         => $locale ?? 'ru',
    'content'        => $renderedContent,
    'unsubscribeUrl' => $unsubscribeUrl ?? null,
]);
