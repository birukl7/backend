<?php

namespace App\Services;

use App\Models\AiMatch;
use App\Models\Cv;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;
use ZipArchive;

class CvTextExtractorService
{
    /**
     * Return plain text for AI pipelines. Upload CVs use extracted file content;
     * builder CVs return null so callers use structured sections.
     */
    public function textForCv(Cv $cv): ?string
    {
        if (! $cv->isUpload()) {
            return null;
        }

        if (filled($cv->extracted_text)) {
            return $cv->extracted_text;
        }

        if (! $cv->file_path) {
            return null;
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($cv->file_path)) {
            return null;
        }

        $extension = strtolower(pathinfo($cv->file_path, PATHINFO_EXTENSION));
        $absolutePath = $disk->path($cv->file_path);

        try {
            $text = $this->extractFromFile($absolutePath, $extension);
        } catch (\Throwable $e) {
            Log::warning('CV text extraction failed', [
                'cv_id' => $cv->id,
                'file'  => $cv->file_path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $text = $this->normalise($text);

        if ($text !== '') {
            $cv->forceFill([
                'extracted_text' => $text,
                'extracted_at'   => now(),
            ])->saveQuietly();
        }

        return $text !== '' ? $text : null;
    }

    public function extractFromFile(string $absolutePath, string $extension): string
    {
        return match ($extension) {
            'pdf'  => $this->extractPdf($absolutePath),
            'docx' => $this->extractDocx($absolutePath),
            default => throw new \InvalidArgumentException("Unsupported CV format: {$extension}"),
        };
    }

    public function extractAndPersist(Cv $cv): ?string
    {
        $text = $this->textForCv($cv);

        if ($text !== null && $cv->is_default) {
            AiMatch::where('user_id', $cv->user_id)->delete();
        }

        return $text;
    }

    private function extractPdf(string $path): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($path);

        return $pdf->getText();
    }

    private function extractDocx(string $path): string
    {
        $zip = new ZipArchive();

        if ($zip->open($path) !== true) {
            throw new \RuntimeException('Could not open DOCX archive.');
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            throw new \RuntimeException('DOCX document.xml not found.');
        }

        $xml = preg_replace('/<w:tab[^>]*\/>/', "\t", $xml) ?? $xml;
        $xml = preg_replace('/<\/w:p>/', "\n", $xml) ?? $xml;
        $xml = preg_replace('/<\/w:tr>/', "\n", $xml) ?? $xml;
        $text = strip_tags($xml);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');

        return $text;
    }

    private function normalise(string $text): string
    {
        $text = preg_replace("/\r\n|\r/", "\n", $text) ?? $text;
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

        return trim($text);
    }
}
