<?php
/**
 * Body content for an event ticket confirmation — rendered into the shared
 * `email_layout.php` shell (head/CSS, 600px container, brand footer).
 * Russian-only (no i18n) — this is a transactional email, not a mailing, so
 * `unsubscribeUrl` is deliberately left unset: the layout's "you're
 * receiving this because you're subscribed" line + unsubscribe link only
 * make sense for `email_newsletter.php`.
 */
ob_start();
?>

<p>Спасибо за регистрацию на астровыезд, в этом письме вы найдёте основную информацию. Ваш билет с QR-кодом — ниже. Покажите его при входе на мероприятие. Если билет не отображается в письме, он всегда доступен в вашем <a href="https://astro.miksoft.pro/profile" target="_blank">личном кабинете</a>.</p>

<h2><?= htmlspecialchars($eventTitle ?? '', ENT_QUOTES, 'UTF-8') ?></h2>

<?php if (!empty($dateTimeValue)): ?>
<p>Дата и время (Оренбургское время): <?= htmlspecialchars($dateTimeValue, ENT_QUOTES, 'UTF-8') ?></p>
<?php if (!empty($gatheringLine)): ?>
<p>Сбор участников на площадке: <?= htmlspecialchars($gatheringLine, ENT_QUOTES, 'UTF-8') ?></p>
<?php endif; ?>
<?php if (!empty($endTimeValue)): ?>
<p>Окончание мероприятия: <?= htmlspecialchars($endTimeValue, ENT_QUOTES, 'UTF-8') ?></p>
<?php endif; ?>
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

<?php
$renderedContent = ob_get_clean();

echo view('email_layout', [
    'subject' => $subject ?? '',
    'locale'  => 'ru',
    'content' => $renderedContent,
]);
