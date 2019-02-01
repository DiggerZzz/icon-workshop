<?php
/**
 * Created by PhpStorm.
 * User: hans
 * Date: 2019/1/31
 * Time: 18:07
 */

namespace App\Services;


use App\Platforms\BaseSplash;
use App\Splash;
use Image;

class SplashService extends BaseService
{
    /** @var Splash $splash */
    public $splash;

    public function __construct(Splash $splash)
    {
        $this->splash = $splash;
        parent::__construct();
    }

    public function generate()
    {
        $config = $this->splash->config;
        $dir = public_path('files') . '/' . $this->splash->folder . '/' . $this->splash->uuid . '/';
        $BASE_SIZE = 750;
        foreach ($config['platforms'] as $platform) {
            $contents = [
                'images' => [],
                'info' => [
                    'version' => 1,
                    'author' => 'https://icon.wuruihong.com',
                ],
            ];
            $fileDir = $dir . $platform . '/';
            $splashConfig = BaseSplash::getInstance($platform);
            foreach ($splashConfig->getSizes() as $item) {
                $width = $item['width'];
                $height = $item['height'];
                $short = min($width, $height);
                $baseScale = $short / $BASE_SIZE * 2;

                $orientation = $width > $height ? 'landscape' : 'portrait';
                if (!in_array($orientation, $config['orientations'])) {
                    continue;
                }

                $fileDir = $dir . $platform . '/' . $item['folder'] . '/';
                static::ensureDir($fileDir);
                $filePath = $fileDir . $item['filename'];

                if (!file_exists($filePath)) {
                    $base = Image::canvas($width, $height, $config['backgroundColor']);
                    foreach ($config['objects'] as $object) {
                        if ($object['proto'] === 'Image') {
                            $img = Image::make(public_path() . $object['url']);
                            $scale = ($object['scale'] ?? 1) * $baseScale;

                            $w = $img->width() * $scale;
                            $h = $img->height() * $scale;
                            $img->resize($w, $h);

                            $base->insert(
                                $img,
                                'top-left',
                                (int)($width * $object['left'] / 100 - $w / 2),
                                (int)($height * $object['top'] / 100 - $h / 2)
                            );
                        }
                    }

                    $base->save($filePath);
                }

                unset($item['width'], $item['height']);
                $contents['images'][] = $item;
            }

            if ($platform === 'ios') {
                file_put_contents($fileDir . 'Contents.json', json_encode($contents, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            }
        }
    }
}