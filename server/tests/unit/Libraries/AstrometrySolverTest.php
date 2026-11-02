<?php

use App\Entities\PhotoAstrometryEntity;
use App\Entities\PhotoEntity;
use App\Libraries\AstrometryClient;
use App\Libraries\AstrometrySolver;
use App\Models\PhotosAstrometryModel;
use App\Models\PhotosModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * The plate solve's state machine, step by step, against a scripted service and an in-memory
 * row. No network, no database.
 *
 * @internal
 */
final class AstrometrySolverTest extends CIUnitTestCase
{
    private string $uploadPath;

    /** The one row, as the fake model keeps it */
    private array $row;

    protected function setUp(): void
    {
        parent::setUp();

        // A real (tiny) image, so getimagesize() has something to measure
        $this->uploadPath = sys_get_temp_dir() . '/astrometry-solver-test-' . uniqid() . '/';
        mkdir($this->uploadPath . 'M1', 0777, true);
        imagepng(imagecreatetruecolor(40, 30), $this->uploadPath . 'M1/M1-2021_large.png');

        $this->row = ['photo_id' => 'p1', 'status' => PhotosAstrometryModel::STATUS_PENDING, 'updated_at' => gmdate('Y-m-d H:i:s')];
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->uploadPath . 'M1/*'));
        rmdir($this->uploadPath . 'M1');
        rmdir($this->uploadPath);

        parent::tearDown();
    }

    /** A service that answers from a script: `jobId`, `status`, or throws */
    private function client(array $answers): AstrometryClient
    {
        return new class ($answers) extends AstrometryClient {
            public array $uploaded = [];

            public function __construct(private readonly array $answers)
            {
                parent::__construct('key');
            }

            public function uploadFile(string $path): int
            {
                $this->uploaded[] = $path;

                if (isset($this->answers['uploadError'])) {
                    throw new RuntimeException($this->answers['uploadError']);
                }

                return 777;
            }

            public function getJobId(int $submissionId): ?int
            {
                return $this->answers['jobId'] ?? null;
            }

            public function getJobStatus(int $jobId): string
            {
                return $this->answers['status'] ?? 'solving';
            }

            public function getCalibration(int $jobId): array
            {
                return ['ra' => 83.6, 'dec' => 22.0, 'radius' => 0.5, 'pixscale' => 1.2, 'orientation' => 10.0, 'parity' => 1];
            }

            public function getWcs(int $jobId): array
            {
                return ['crval' => [83.6, 22.0]];
            }

            public function getAnnotations(int $jobId): array
            {
                return [['type' => 'messier', 'names' => ['M 1'], 'pixelx' => 20, 'pixely' => 15, 'radius' => 5]];
            }
        };
    }

    /** The row kept in this test's array instead of a table */
    private function model(): PhotosAstrometryModel
    {
        $test = $this;

        return new class ($test) extends PhotosAstrometryModel {
            public function __construct(private readonly AstrometrySolverTest $test)
            {
                // No parent constructor: no database connection
            }

            public function find($id = null)
            {
                // As the real model hydrates it: attributes set raw, cast on read
                return (new PhotoAstrometryEntity())->injectRawData($this->test->row());
            }

            public function update($id = null, $row = null): bool
            {
                $this->test->patch($row);

                return true;
            }
        };
    }

    private function photos(): PhotosModel
    {
        return new class extends PhotosModel {
            public function __construct()
            {
            }

            public function find($id = null)
            {
                return new PhotoEntity(['id' => 'p1', 'dir_name' => 'M1', 'file_name' => 'M1-2021', 'file_ext' => 'png']);
            }
        };
    }

    public function row(): array
    {
        return $this->row;
    }

    private function entity(): PhotoAstrometryEntity
    {
        return (new PhotoAstrometryEntity())->injectRawData($this->row);
    }

    public function patch(array $fields): void
    {
        $this->row = array_merge($this->row, $fields);
    }

    private function solver(array $answers): AstrometrySolver
    {
        return new AstrometrySolver($this->client($answers), $this->model(), $this->photos(), $this->uploadPath);
    }

    public function testPendingRowIsUploadedAndTurnsSolving(): void
    {
        $result = $this->solver([])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_SOLVING, $result->status);
        $this->assertSame(777, $result->submission_id);
        $this->assertSame(40, $result->solved_width);
        $this->assertSame(30, $result->solved_height);
    }

    public function testSolvingRowWithoutJobYetStaysSolving(): void
    {
        $this->patch(['status' => PhotosAstrometryModel::STATUS_SOLVING, 'submission_id' => 777]);

        $result = $this->solver([])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_SOLVING, $result->status);
        $this->assertNull($result->job_id);
    }

    public function testJobStillRunningKeepsTheJobId(): void
    {
        $this->patch(['status' => PhotosAstrometryModel::STATUS_SOLVING, 'submission_id' => 777]);

        $result = $this->solver(['jobId' => 42, 'status' => 'solving'])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_SOLVING, $result->status);
        $this->assertSame(42, $result->job_id);
    }

    public function testFinishedJobStoresTheSolution(): void
    {
        $this->patch(['status' => PhotosAstrometryModel::STATUS_SOLVING, 'submission_id' => 777, 'job_id' => 42]);

        $result = $this->solver(['status' => 'success'])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_SUCCESS, $result->status);
        $this->assertEqualsWithDelta(83.6, $result->ra, 1e-9);
        $this->assertSame(1, $result->parity);
        $this->assertEqualsWithDelta([83.6, 22.0], $result->wcs['crval'], 1e-9);
        $this->assertSame('M 1', $result->annotations[0]['names'][0]);
        $this->assertNotNull($result->solved_at);
    }

    public function testFailedJobEndsAsFailedWithAReason(): void
    {
        $this->patch(['status' => PhotosAstrometryModel::STATUS_SOLVING, 'submission_id' => 777, 'job_id' => 42]);

        $result = $this->solver(['status' => 'failure'])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_FAILED, $result->status);
        $this->assertStringContainsString('not recognised', $result->error);
    }

    public function testServiceErrorEndsAsFailed(): void
    {
        $result = $this->solver(['uploadError' => 'HTTP 500'])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_FAILED, $result->status);
        $this->assertSame('HTTP 500', $result->error);
    }

    public function testStaleSolvingRowTimesOut(): void
    {
        $this->patch([
            'status'        => PhotosAstrometryModel::STATUS_SOLVING,
            'submission_id' => 777,
            'updated_at'    => gmdate('Y-m-d H:i:s', time() - 3600),
        ]);

        $result = $this->solver([])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_FAILED, $result->status);
    }

    public function testFinalRowIsLeftAlone(): void
    {
        $this->patch(['status' => PhotosAstrometryModel::STATUS_SUCCESS, 'ra' => 1.0]);

        $result = $this->solver(['status' => 'failure'])->step($this->entity());

        $this->assertSame(PhotosAstrometryModel::STATUS_SUCCESS, $result->status);
    }
}
