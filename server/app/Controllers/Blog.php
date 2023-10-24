<?php namespace App\Controllers;

use App\Libraries\BlogLibrary;
use App\Models\BlogMediaModel;
use App\Models\BlogModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Blog extends ResourceController {
    use ResponseTrait;

    /**
     * Camera image by id
     * @return ResponseInterface
     */
    public function list(): ResponseInterface {
        $limit  = $this->request->getGet('limit', FILTER_SANITIZE_NUMBER_INT) ?? 2;
        $offset = $this->request->getGet('offset', FILTER_SANITIZE_NUMBER_INT) ?? 0;
        $order  = $this->request->getGet('order', FILTER_SANITIZE_SPECIAL_CHARS) ?? 'telegram_date';
        $sort   = $this->request->getGet('sort', FILTER_SANITIZE_SPECIAL_CHARS) ?? 'DESC';

        $modelBlog = new BlogModel();
        $dataBlog  = $modelBlog->orderBy($order, $sort === 'DESC' ? 'DESC' : 'ASC')->findAll($limit, $offset);

        return $this->respond([
            'items' => $this->_addMediaToBlogList($dataBlog),
            'total' => $modelBlog->countAllResults()
        ]);
    }

    /**
     * @return ResponseInterface
     */
    public function statistic(): ResponseInterface {
        $blogLibrary   = new BlogLibrary();
        $blogStatistic = $blogLibrary->getTelegramChannelStatistic('nearspace');

        return $this->respond([
            'users' => $blogStatistic['full']['participants_count']
        ]);
    }

    /**
     * @return ResponseInterface
     */
    public function popular(): ResponseInterface {
        $date1 = strtotime("-30 days");
        $date2 = strtotime("now");
        $limit = $this->request->getGet('limit', FILTER_SANITIZE_NUMBER_INT) ?? 5;

        $modelBlog = new BlogModel();
        $dataBlog  = $modelBlog
            ->where("telegram_date BETWEEN {$date1} AND {$date2}")
            ->orderBy('views', 'DESC')
            ->findAll($limit);

        return $this->respond([
            'items' => $this->_addMediaToBlogList($dataBlog),
            'total' => $limit
        ]);
    }

    /**
     * @param $dataBlog
     * @return mixed
     */
    protected function _addMediaToBlogList($dataBlog) {
        $collections = [];

        foreach ($dataBlog as $item) {
            if (!in_array($item->group_id, $collections))
            {
                $collections[] = $item->group_id;
            }
        }

        $modelBlogMedia = new BlogMediaModel();
        $dataBlogMedia  = $modelBlogMedia
            ->select(['file', 'file_type', 'height', 'width', 'group_id'])
            ->whereIn('group_id', $collections)
            ->findAll();

        if ($dataBlogMedia) {
            foreach ($dataBlogMedia as $index => $media) {
                $key = array_search($media->group_id, array_column($dataBlog, 'group_id'));

                if ($key === false) {
                    continue;
                }

                unset($media->group_id);

                $dataBlog[$key]->media = $dataBlog[$key]->media ? [$media, ...$dataBlog[$key]->media] : [$media];

                unset($dataBlogMedia[$index]);
            }
        }

        return $dataBlog;
    }
}