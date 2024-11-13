<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class CategoriesSeeder extends Seeder
{
    public function run()
    {
        $data = [
            [
                'title_en' => 'Galaxy',
                'title_ru' => 'Галактика',
                'description_en' => 'A massive, gravitationally bound system consisting of stars, stellar remnants, interstellar gas, dust, and dark matter.',
                'description_ru' => 'Огромная система, состоящая из звезд, звездных остатков, межзвездного газа, пыли и темной материи, связанная гравитацией.',
            ],
            [
                'title_en' => 'Nebula',
                'title_ru' => 'Туманность',
                'description_en' => 'A giant cloud of dust and gas in space, often a region where new stars are born.',
                'description_ru' => 'Огромное облако пыли и газа в космосе, часто являющееся областью рождения новых звезд.',
            ],
            [
                'title_en' => 'Star',
                'title_ru' => 'Звезда',
                'description_en' => 'A massive, luminous sphere of plasma held together by gravity.',
                'description_ru' => 'Огромная, светящаяся сфера из плазмы, удерживаемая гравитацией.',
            ],
            [
                'title_en' => 'Binary Star',
                'title_ru' => 'Двойная звезда',
                'description_en' => 'A system of two stars that orbit around a common center of mass.',
                'description_ru' => 'Система из двух звезд, вращающихся вокруг общего центра масс.',
            ],
            [
                'title_en' => 'Star Cluster',
                'title_ru' => 'Скопление',
                'description_en' => 'A group of stars that are gravitationally bound together.',
                'description_ru' => 'Группа звезд, гравитационно связанных друг с другом.',
            ],
            [
                'title_en' => 'Supernova',
                'title_ru' => 'Сверхновая',
                'description_en' => 'An astronomical event that occurs during the last stages of a massive star\'s life, resulting in a spectacular explosion.',
                'description_ru' => 'Астрономическое событие, происходящее на последней стадии жизни массивной звезды, приводящее к впечатляющему взрыву.',
            ],
            [
                'title_en' => 'Black Hole',
                'title_ru' => 'Черная дыра',
                'description_en' => 'A region of space where the gravitational pull is so strong that nothing, not even light, can escape from it.',
                'description_ru' => 'Область пространства, где гравитационное притяжение настолько велико, что ничто, даже свет, не может вырваться наружу.',
            ],
            [
                'title_en' => 'Comet',
                'title_ru' => 'Комета',
                'description_en' => 'A small celestial body that orbits the Sun and has a visible coma (atmosphere) and tail when close to the Sun.',
                'description_ru' => 'Небольшое небесное тело, вращающееся вокруг Солнца и имеющее видимую кому (атмосферу) и хвост, когда приближается к Солнцу.',
            ],
            [
                'title_en' => 'Asteroid',
                'title_ru' => 'Астероид',
                'description_en' => 'A small rocky body orbiting the Sun, mostly found in the asteroid belt between Mars and Jupiter.',
                'description_ru' => 'Маленькое каменистое тело, вращающееся вокруг Солнца, в основном находящееся в поясе астероидов между Марсом и Юпитером.',
            ],
            [
                'title_en' => 'Planet',
                'title_ru' => 'Планета',
                'description_en' => 'A celestial body that orbits a star, has sufficient mass for its gravity to make it nearly spherical, and has cleared its orbit of other debris.',
                'description_ru' => 'Небесное тело, которое вращается вокруг звезды, обладает достаточной массой, чтобы гравитация придала ему почти сферическую форму, и расчистило свою орбиту от других объектов.',
            ],
            [
                'title_en' => 'Moon',
                'title_ru' => 'Спутник',
                'description_en' => 'A natural satellite that orbits a planet.',
                'description_ru' => 'Естественный спутник, вращающийся вокруг планеты.',
            ],
            [
                'title_en' => 'Dwarf Planet',
                'title_ru' => 'Карликовая планета',
                'description_en' => 'A celestial body that orbits the Sun, is nearly spherical, but has not cleared its orbit of other debris.',
                'description_ru' => 'Небесное тело, вращающееся вокруг Солнца, почти сферическое, но не расчистившее свою орбиту от других объектов.',
            ],
            [
                'title_en' => 'Exoplanet',
                'title_ru' => 'Экзопланета',
                'description_en' => 'A planet that orbits a star outside the Solar System.',
                'description_ru' => 'Планета, вращающаяся вокруг звезды за пределами Солнечной системы.',
            ],
            [
                'title_en' => 'Quasar',
                'title_ru' => 'Квазар',
                'description_en' => 'An extremely luminous active galactic nucleus powered by a supermassive black hole.',
                'description_ru' => 'Чрезвычайно светящееся активное ядро галактики, питаемое сверхмассивной черной дырой.',
            ],
            [
                'title_en' => 'Pulsar',
                'title_ru' => 'Пульсар',
                'description_en' => 'A highly magnetized, rotating neutron star that emits beams of electromagnetic radiation.',
                'description_ru' => 'Сильно намагниченная вращающаяся нейтронная звезда, испускающая пучки электромагнитного излучения.',
            ],
            [
                'title_en' => 'Protostar',
                'title_ru' => 'Протозвезда',
                'description_en' => 'A contracting mass of gas that represents an early stage in the formation of a star.',
                'description_ru' => 'Сжимающаяся масса газа, представляющая собой раннюю стадию формирования звезды.',
            ],
            [
                'title_en' => 'Brown Dwarf',
                'title_ru' => 'Коричневый карлик',
                'description_en' => 'A substellar object that is not massive enough to sustain nuclear fusion of hydrogen in its core.',
                'description_ru' => 'Субзвездный объект, недостаточно массивный для поддержания термоядерного синтеза водорода в своем ядре.',
            ],
            [
                'title_en' => 'White Dwarf',
                'title_ru' => 'Белый карлик',
                'description_en' => 'A small, dense remnant of a star that has exhausted its nuclear fuel and collapsed.',
                'description_ru' => 'Маленький, плотный остаток звезды, исчерпавший свои ядерные запасы и коллапсировавший.',
            ],
            [
                'title_en' => 'Red Giant',
                'title_ru' => 'Красный гигант',
                'description_en' => 'A dying star that has exhausted the hydrogen in its core and expanded in size.',
                'description_ru' => 'Умирающая звезда, которая исчерпала водород в своем ядре и увеличилась в размерах.',
            ],
        ];

        $this->db->table('categories')->insertBatch($data);
    }
}
