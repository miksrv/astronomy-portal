<?php

namespace App\Libraries;

use Config\Astrometry;
use Config\Services;
use CURLFile;
use RuntimeException;

/**
 * The nova.astrometry.net API (https://nova.astrometry.net/api_help): a session from the API
 * key, an image upload, the submission → job → results walk, and the WCS header the frontend
 * needs to put RA/Dec on the picture's pixels. Every call throws a RuntimeException on a
 * transport or a service error, so a caller handles one failure path.
 */
class AstrometryClient
{
    private ?string $session = null;

    public function __construct(private readonly string $apiKey)
    {
    }

    /** A client is usable only with a key configured */
    public static function isConfigured(): bool
    {
        return Astrometry::apiKey() !== '';
    }

    public static function fromConfig(): self
    {
        return new self(Astrometry::apiKey());
    }

    /** Signs in and keeps the session for the uploads */
    public function login(): void
    {
        $result        = $this->post('api/login', ['apikey' => $this->apiKey]);
        $this->session = (string) ($result['session'] ?? '');

        if ($this->session === '') {
            throw new RuntimeException('astrometry.net login returned no session');
        }
    }

    /**
     * Uploads an image file for solving. The job is kept private on the service.
     *
     * @return int The submission id
     */
    public function uploadFile(string $path): int
    {
        if ($this->session === null) {
            $this->login();
        }

        $result = $this->post(
            'api/upload',
            [
                'session'              => $this->session,
                'publicly_visible'     => 'n',
                'allow_modifications'  => 'd',
                'allow_commercial_use' => 'd',
            ],
            new CURLFile($path, mime_content_type($path) ?: 'image/jpeg', basename($path))
        );

        if (empty($result['subid'])) {
            throw new RuntimeException('astrometry.net upload returned no submission id');
        }

        return (int) $result['subid'];
    }

    /**
     * The job of a submission, once the service has started one
     *
     * @return int|null The job id, or null while the submission is still queued
     */
    public function getJobId(int $submissionId): ?int
    {
        $result = $this->get("api/submissions/{$submissionId}");
        $jobs   = array_filter($result['jobs'] ?? []);

        return $jobs ? (int) reset($jobs) : null;
    }

    /** `solving`, `success` or `failure` */
    public function getJobStatus(int $jobId): string
    {
        return (string) ($this->get("api/jobs/{$jobId}")['status'] ?? 'unknown');
    }

    /** `ra`, `dec`, `radius`, `pixscale`, `orientation`, `parity` of a solved job */
    public function getCalibration(int $jobId): array
    {
        return $this->get("api/jobs/{$jobId}/calibration");
    }

    /**
     * The catalogue objects on the picture: `type`, `names`, `pixelx`, `pixely`, `radius`
     * each, in the solved file's pixels
     */
    public function getAnnotations(int $jobId): array
    {
        return $this->get("api/jobs/{$jobId}/annotations")['annotations'] ?? [];
    }

    /** The WCS header of a solved job, parsed (see parseWcsHeader()) */
    public function getWcs(int $jobId): array
    {
        $response = $this->http()->get("wcs_file/{$jobId}");

        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException("astrometry.net wcs_file/{$jobId}: HTTP {$response->getStatusCode()}");
        }

        return self::parseWcsHeader($response->getBody());
    }

    /**
     * Parses a FITS header (80-character cards) of a TAN + SIP solution into what the
     * frontend's `utils/wcs.ts` expects: the reference point (`crval`, `crpix`), the `cd`
     * matrix, the solved image size and the SIP polynomials as `[i, j, coefficient]` terms.
     */
    public static function parseWcsHeader(string $fits): array
    {
        $header = [];

        for ($offset = 0; $offset + 80 <= strlen($fits); $offset += 80) {
            $card = substr($fits, $offset, 80);

            if (rtrim($card) === 'END') {
                break;
            }

            if (!preg_match('/^([A-Z0-9_-]+)\s*=\s*(\'[^\']*\'|[^\/]+)/', $card, $match)) {
                continue;
            }

            $raw = trim($match[2]);

            if (str_starts_with($raw, "'")) {
                $header[$match[1]] = trim(substr($raw, 1, -1));
            } elseif ($raw === 'T' || $raw === 'F') {
                $header[$match[1]] = $raw === 'T';
            } else {
                $header[$match[1]] = (float) $raw;
            }
        }

        foreach (['CRVAL1', 'CRVAL2', 'CRPIX1', 'CRPIX2', 'CD1_1', 'CD1_2', 'CD2_1', 'CD2_2'] as $required) {
            if (!isset($header[$required])) {
                throw new RuntimeException("WCS header has no {$required}");
            }
        }

        $polynomial = static function (string $prefix) use ($header): ?array {
            if (!isset($header["{$prefix}_ORDER"])) {
                return null;
            }

            $order = (int) $header["{$prefix}_ORDER"];
            $terms = [];

            for ($i = 0; $i <= $order; $i++) {
                for ($j = 0; $j <= $order - $i; $j++) {
                    $coefficient = $header["{$prefix}_{$i}_{$j}"] ?? 0.0;

                    if ($coefficient != 0.0) {
                        $terms[] = [$i, $j, $coefficient];
                    }
                }
            }

            return $terms;
        };

        $sip = isset($header['A_ORDER'])
            ? array_filter([
                'a'  => $polynomial('A'),
                'b'  => $polynomial('B'),
                'ap' => $polynomial('AP'),
                'bp' => $polynomial('BP'),
            ], static fn ($terms) => $terms !== null)
            : null;

        return [
            'crval'  => [$header['CRVAL1'], $header['CRVAL2']],
            'crpix'  => [$header['CRPIX1'], $header['CRPIX2']],
            'cd'     => [[$header['CD1_1'], $header['CD1_2']], [$header['CD2_1'], $header['CD2_2']]],
            'width'  => (int) ($header['IMAGEW'] ?? 0),
            'height' => (int) ($header['IMAGEH'] ?? 0),
            'sip'    => $sip,
        ];
    }

    /**
     * @param int $timeout Seconds to wait for the whole exchange. The status calls are tiny
     *                     and answered by a browser poll, so they give up fast; only the
     *                     upload of the picture gets a long one
     */
    private function http(int $timeout = 15): \CodeIgniter\HTTP\CURLRequest
    {
        return Services::curlrequest([
            'baseURI'         => Astrometry::API_URL,
            'timeout'         => $timeout,
            'connect_timeout' => 10,
            'http_errors'     => false,
        ]);
    }

    private function get(string $path): array
    {
        $response = $this->http()->get($path);

        return $this->decode($path, $response->getStatusCode(), $response->getBody());
    }

    /** The service takes its arguments as a JSON string in the `request-json` form field */
    private function post(string $path, array $request, ?CURLFile $file = null): array
    {
        $fields = ['request-json' => json_encode($request)];

        if ($file) {
            $fields['file'] = $file;
        }

        $response = $this->http($file ? 120 : 15)->post($path, $file ? ['multipart' => $fields] : ['form_params' => $fields]);

        return $this->decode($path, $response->getStatusCode(), $response->getBody());
    }

    private function decode(string $path, int $status, string $body): array
    {
        if ($status !== 200) {
            throw new RuntimeException("astrometry.net {$path}: HTTP {$status}");
        }

        $data = json_decode($body, true);

        if (!is_array($data)) {
            throw new RuntimeException("astrometry.net {$path}: not a JSON response");
        }

        if (($data['status'] ?? '') === 'error') {
            throw new RuntimeException("astrometry.net {$path}: " . ($data['errormessage'] ?? 'error'));
        }

        return $data;
    }
}
