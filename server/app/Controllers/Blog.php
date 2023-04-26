<?php namespace App\Controllers;

use App\Models\BlogMediaModel;
use App\Models\BlogModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Blog extends ResourceController
{
    use ResponseTrait;

    /**
     * Camera image by id
     * @return ResponseInterface
     */
    public function list(): ResponseInterface
    {
        $limit  = $this->request->getGet('limit', FILTER_SANITIZE_NUMBER_INT) ?? 1;
        $offset = $this->request->getGet('offset', FILTER_SANITIZE_NUMBER_INT) ?? 0;
        $order  = $this->request->getGet('order', FILTER_SANITIZE_SPECIAL_CHARS) ?? 'telegram_date';
        $sort   = $this->request->getGet('sort', FILTER_SANITIZE_SPECIAL_CHARS) ?? 'DESC';

        $modelBlog = new BlogModel();
        $dataBlog  = $modelBlog->orderBy($order, $sort === 'DESC' ? 'DESC' : 'ASC')->findAll($limit, $offset);

        $collections = [];

        foreach ($dataBlog as $item)
        {
            if (!in_array($item->group_id, $collections))
            {
                $collections[] = $item->group_id;
            }
        }

        $modelBlogMedia = new BlogMediaModel();
        $dataBlogMedia  = $modelBlogMedia
            ->select(['media_type', 'media_file', 'group_id'])
            ->whereIn('group_id', $collections)
            ->findAll();

        if ($dataBlogMedia)
        {
            foreach ($dataBlogMedia as $index => $media)
            {
                $key = array_search($media->group_id, array_column($dataBlog, 'group_id'));

                if ($key === false) continue;

                unset($media->group_id);

                $dataBlog[$key]->media = $dataBlog[$key]->media ? [$media, ...$dataBlog[$key]->media] : [$media];

                unset($dataBlogMedia[$index]);
            }
        }

        return $this->respond([
            'items' => $dataBlog,
            'total' => $modelBlog->countAllResults()
        ]);
    }
}