<?php

use App\Services\CvTextExtractorService;

test('docx text extraction reads document body', function () {
    $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'cv-test-'.uniqid().'.docx';

    $zip = new ZipArchive();
    expect($zip->open($path, ZipArchive::CREATE))->toBeTrue();
    $zip->addFromString(
        'word/document.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        .'<w:body><w:p><w:r><w:t>Laravel Developer</w:t></w:r></w:p>'
        .'<w:p><w:r><w:t>PHP and React experience</w:t></w:r></w:p></w:body></w:document>'
    );
    $zip->close();

    $extractor = new CvTextExtractorService();
    $text = $extractor->extractFromFile($path, 'docx');

    @unlink($path);

    expect($text)->toContain('Laravel Developer')
        ->and($text)->toContain('PHP and React experience');
});
