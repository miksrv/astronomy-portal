<?php

namespace App\Libraries;

use CodeIgniter\Files\File;
use CodeIgniter\I18n\Time;
use Config\Services;

class PhotoUploadLibrary {

    /**
     * Загружает файл, создает директорию и генерирует уникальное имя файла.
     *
     * @param File $file
     * @param array $objects
     * @param string $date
     * @return array
     */
    public function handleFileUpload(File $file, array $objects, string $date): array
    {
        // Генерация шаблона имени файла
        $directoryName = implode('-', str_replace(['.', '/', '\\', '_', '-', ' '], '', $objects));
        $directoryPath = UPLOAD_PHOTOS . $directoryName;

        // Создание директории, если её нет
        if (!is_dir($directoryPath)) {
            mkdir($directoryPath, 0755, true);
        }

        // Генерация имени файла с датой
        $baseFileName  = $directoryName . '-' . (new Time($date))->format('d.m.Y');
        $fileExtension = $file->getExtension();
        $fileName      = $baseFileName . '.' . $fileExtension;

        // Проверка, существует ли файл и рекурсивное добавление индекса
        $counter = 1;
        $finalFileName = $fileName;
        while (file_exists($directoryPath . '/' . $finalFileName)) {
            $finalFileName = $baseFileName . '-' . $counter++ . '.' . $fileExtension;
        }

        // Перемещение файла в нужную директорию
        $file->move($directoryPath, $finalFileName);

        // Получение пути к файлу
        $filePath = $directoryPath . '/' . $finalFileName;

        // Получение размера и свойств изображения
        [$width, $height] = getimagesize($filePath);

        // Генерация превью изображений
        $previewFiles = $this->createImagePreviews($filePath, $directoryPath);

        // Получаем имя файла и его расширение
        $fileName      = pathinfo($filePath, PATHINFO_FILENAME);
        $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);

        return [
            'dir_name'     => $directoryName,
            'file_name'    => $fileName,
            'file_ext'     => $fileExtension,
            'file_size'    => $file->getSize(),
            'file_path'    => $filePath,
            'image_width'  => $width,
            'image_height' => $height,
            'previews'     => $previewFiles, // Добавляем превью
        ];
    }

    /**
     * Создает несколько превью изображений с разными размерами.
     *
     * @param string $filePath Путь к файлу
     * @param string $uploadPath Путь для сохранения изображений
     * @return array Список созданных файлов
     */
    private function createImagePreviews(string $filePath, string $uploadPath): array
    {
        // Получаем имя файла и его расширение
        $fileName      = pathinfo($filePath, PATHINFO_FILENAME);
        $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);
        
        // Список для хранения путей к сохраненным превью
        $previewFiles = [];

        // Создаем экземпляр сервиса обработки изображений
        $image = Services::image('gd');

        // Маленькое изображение 80x18 (сначала уменьшаем, потом обрезаем)
        $smallFileName = $fileName . '_small.' . $fileExtension;
        $smallImagePath = $uploadPath . '/' . $smallFileName;
        $image->withFile($filePath)
              ->fit(160, 36, 'center')
              ->save($smallImagePath);
        $previewFiles['small'] = $smallFileName;

        // Среднее изображение 355x200 (сначала уменьшаем, потом обрезаем)
        $mediumFileName = $fileName . '_medium.' . $fileExtension;
        $mediumImagePath = $uploadPath . '/' . $mediumFileName;
        $image->withFile($filePath)
              ->fit(355, 300, 'center') // Уменьшаем до 355x200, сохраняя пропорции
              ->save($mediumImagePath);
        $previewFiles['medium'] = $mediumFileName;

        // Большое изображение 2048x1024 (сначала уменьшаем, потом обрезаем)
        $largeFileName = $fileName . '_large.' . $fileExtension;
        $largeImagePath = $uploadPath . '/' . $largeFileName;
        $image->withFile($filePath)
              ->resize(2048, 1024, true)
              ->save($largeImagePath);
        $previewFiles['large'] = $largeFileName;

        // $this->addWatermark($uploadPath . '/' . $largeFileName, [
        //     'M82 Spiral Galaxy',
        //     'HEQ6Pro, ZWO ASI 6200, SVBony 60, QUI5, EAF, EFW',
        //     'Exposure: 50 sec, Frames: 200, 20 Jan 2024'
        // ]);

        // Возвращаем массив с путями к превью
        return $previewFiles;
    }

    /**
     * Накладывает watermark на изображение.
     *
     * @param string $filePath Путь к изображению
     * @param array $watermarkText Массив из 3 строк текста для watermark
     * @param bool $saveOriginal Флаг для сохранения исходного файла (перезаписать или сделать резервную копию)
     * @return void
     */
    private function addWatermark(string $filePath, array $watermarkText, bool $saveOriginal = false): void
    {
        // Получаем расширение и имя файла
        $fileName      = pathinfo($filePath, PATHINFO_FILENAME);
        $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);
        $directoryPath = dirname($filePath);

        // Создаем резервную копию оригинала, если требуется
        if ($saveOriginal) {
            $backupFilePath = $directoryPath . '/' . $fileName . '_backup.' . $fileExtension;
            if (!file_exists($backupFilePath)) {
                copy($filePath, $backupFilePath);  // Создаем копию
            }
        }

        // Загружаем изображение
        $image = \Config\Services::image('gd');
        $image->withFile($filePath);
        
        // Определяем размеры изображения и пропорциональный размер шрифта
        $imageWidth  = $image->getWidth();
        $imageHeight = $image->getHeight();
        $baseFontSize = min($imageWidth, $imageHeight) * 0.030;  // Размер шрифта ~5% от меньшей стороны
        
        // Устанавливаем путь к шрифту
        $fontPath = WRITEPATH . 'uploads/NavineDemo-SemiCondensed.ttf';
        $fontPathBold = WRITEPATH . 'uploads/GOST_A_.ttf';

        // Определение начальных позиций и отступов для строк
        $xPosition = $imageWidth * 0.02;  // Отступ слева 2% от ширины изображения
        $yPosition = $imageHeight * 0.975; // Отступ снизу 2% от высоты изображения
        $lineSpacing = $baseFontSize * 1.2;  // Пропорциональный отступ между строками (120% размера шрифта)

        // Перебираем строки watermark с нижней строки к верхней
        foreach (array_reverse($watermarkText) as $index => $textLine) {
            $currentFontSize = ($index === count($watermarkText) - 1) ? $baseFontSize : $baseFontSize * 0.7;  // Уменьшенный шрифт для остальных строк

            $image->text(
                $textLine,
                [
                    'color'      => '#fff',
                    'opacity'    => 0.5,
                    'withShadow' => false,
                    'hAlign'     => 'left',
                    'vAlign'     => 'center',
                    'fontSize'   => $currentFontSize,
                    'fontPath'   => ($index ===  0) ? $fontPathBold : $fontPath,
                    'vOffset'    => $yPosition,
                    'hOffset'    => $xPosition,
                ]
            );

            // Смещаем y-координату вверх на расстояние пропорционального отступа
            $yPosition -= ($index ===  0) ? $lineSpacing : $lineSpacing + 10;
        }

        // Сохраняем изображение с наложенным watermark
        $image->save($filePath, 100);
    }
}
