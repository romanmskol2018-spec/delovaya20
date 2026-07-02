<?php
/**
 * Деловая20 — обработчик формы заявки.
 * Отправляет заявку на info@emuna.ru через встроенную функцию mail().
 *
 * Для работы:
 *   1. Хостинг должен поддерживать PHP и функцию mail() (большинство рос. хостингов — да).
 *   2. В script.js установите DEMO_MODE = false.
 *   3. Форма отправляет данные сюда (ENDPOINT = "send.php").
 *
 * Если письма не доходят — обычно нужно, чтобы адрес в поле From был на домене сайта
 * (см. переменную $from ниже). Уточните у хостинг-провайдера.
 */

header('Content-Type: application/json; charset=utf-8');

// Разрешаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

// --- Антиспам: honeypot ---
if (!empty($_POST['company'])) {
    // Бот заполнил скрытое поле — тихо отвечаем «успех», письмо не шлём.
    echo json_encode(['ok' => true]);
    exit;
}

// --- Сбор и очистка данных ---
function clean($key) {
    $v = isset($_POST[$key]) ? trim($_POST[$key]) : '';
    // защита от инъекций в заголовки письма
    $v = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v);
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

$name    = clean('name');
$phone   = clean('phone');
$email   = clean('email');
$area    = clean('area');
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
$message = htmlspecialchars(str_replace(["\r\n", "\r"], "\n", $message), ENT_QUOTES, 'UTF-8');

// --- Серверная валидация (дублирует клиентскую) ---
$errors = [];
if (mb_strlen($name) < 2) {
    $errors[] = 'имя';
}
$digits = preg_replace('/\D/', '', $phone);
if (mb_strlen($digits) < 11) {
    $errors[] = 'телефон';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'email';
}
if (empty($_POST['consent'])) {
    $errors[] = 'согласие на обработку данных';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Проверьте поля: ' . implode(', ', $errors)]);
    exit;
}

// --- Формирование письма ---
$to      = 'info@emuna.ru';
$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта Деловая20') . '?=';

$host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST']) : 'delovaya20.ru';
$from = 'no-reply@' . $host;

$body  = "Новая заявка с сайта Деловая20\n";
$body .= "-----------------------------------\n";
$body .= "Имя:      {$name}\n";
$body .= "Телефон:  {$phone}\n";
$body .= "Email:    {$email}\n";
$body .= "Площадь:  " . ($area !== '' ? $area : 'не указана') . "\n";
$body .= "Комментарий:\n" . ($message !== '' ? $message : 'нет') . "\n";
$body .= "-----------------------------------\n";
$body .= "Дата:     " . date('d.m.Y H:i') . "\n";
$body .= "IP:       " . ($_SERVER['REMOTE_ADDR'] ?? 'н/д') . "\n";

$headers  = "From: Деловая20 <{$from}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

$sent = @mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Не удалось отправить письмо. Попробуйте позвонить: +7 (495) 969-16-15']);
}
