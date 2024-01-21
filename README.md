Amateur astronomical observatory portal
===============
[![UI Checks](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-checks.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-checks.yml)
[![UI Deploy](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-deploy.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-deploy.yml)
[![API Deploy](https://github.com/miksrv/astronomy-portal/actions/workflows/api-deploy.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/api-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=miksrv_astronomy-portal&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=miksrv_astronomy-portal)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=miksrv_astronomy-portal&metric=coverage)](https://sonarcloud.io/summary/new_code?id=miksrv_astronomy-portal)

This astronomical portal is a self-made automatic remote astronomical observatory with a convenient interface for managing and monitoring its operation. The portal provides an opportunity to view data received by the telescope and processed photographs. The server part ensures the stable operation of the portal and the receipt of data from the observatory controller, as well as the loading of FITS frames. The Arduino controller has firmware that allows you to manage the power of devices, collect information from temperature and humidity sensors, as well as other telemetry parameters that are transmitted to this portal.

🌐 http://astro.miksoft.pro

## Table of contents
1. [Online Service](#Online-Service)
2. [Observatory](#Observatory)
3. [Controller components ](#Controller-components)
4. [API methods](#API-methods)
5. [Project structure](#Project-structure)
6. [How to start](#How-to-start)

---------------------
### Online Service Website
The site is made on a microservice architecture; there is a separate client application (site) and a server that processes data from the observatory, uploads it to the database and allows visualization on the site. Thus, all data that has ever been received by the observatory is stored on the site. You can see what objects were photographed, at what time, what filters were used, what the moon phase was, the weather and much more.

#### Main Page
General statistics of the observatory, random processed photos and an event calendar displaying the total weather for the night, sunrise and sunset, and footage for the night.

![ain Page](./client/public/screenshots/main.jpg)

#### Blog Page
Materials from the telegram channel are automatically duplicated here for ease of reading.

![Blog Page](./client/public/screenshots/blog.jpg)

#### Celestial Map Page
Interactive map of objects photographed by the observatory.

![Celestial Map Page](./client/public/screenshots/celestial.jpg)

#### Astronomy Photos Page
This section stores all processed photos. Photo processing is done manually and takes time. On the page of each photo there is detailed information about the photo, parameters and, of course, the ability to download it in full resolution.

![Astronomy Photos Page](./client/public/screenshots/photos.jpg)

#### Astronomy Objects Page
A list of all objects that the observatory records. The table shows the total number of frames captured, shutter speed in general and for each filter. When you go to the page of each object, you will see deviation graphs, a table of frames and a list of processed photographs of the object.

![Astronomy Objects Page](./client/public/screenshots/objects.jpg)

#### Observatory Dashboard Page
All information in real time from the telescope equipment - online cameras, power status of devices, current weather data and graphs of sensors inside the observatory.

![Observatory Dashboard Page](./client/public/screenshots/dashboard.jpg)

### Observatory 

This is an amateur and completely homemade astronomical observatory project. The goal of the project is to teach the skills of building objects offline, writing drivers in C++, scripts in Python to automate the process of equipment operation. In addition, obtaining good astrophotography of deep-sky objects, observing comets, asteroids and searching for supernovae and variable stars. 

![Homemade astronomical observatory](./client/public/photos/observatory-3.jpeg)

The observatory controller is based on Ardunio (AVR) and connects to the observatory network. The controller is controlled by means of HTTP requests, which send commands to switch the state of the relay and other elements of the power load. The controller's WEB client sends statistics to a remote server ([API](https://github.com/miksrv/api-backend)) at a specified time interval. The web interface in this repository displays statistics from the backend server and sends commands to the observatory controller through it. 

![The observatory controller](./client/public/photos/observatory-2.jpeg)

## Controller components 
- Arduino Mega 2560
- INA219 I2C sensor
- Relay shield 16 channel
- DHT22
- DS18B20

## API methods
The response format is JSON, the response structure is always the same, only payload will change in different APIs

```json
{
  "status": true,
  "payload": []
}
```

<details>
    <summary>Statistic: Frames, photos, exposure and data volume</summary>

  ``/api/get/statistic/summary``
  ```json
    {
      "photos": 63,
      "objects": 89,
      "frames": 5987,
      "exposure": 1785611,
      "filesize": 196289
    }
  ```
</details>

<details>
    <summary>Statistic: List days in a month (ex: 2022-05) when the observatory worked (stat)</summary>

  ``/api/get/statistic/month?date=${string}``
  ```json
    [
      {
        "date": "2022-05-06",
        "exposure": 4500,
        "frames": 15,
        "objects": [
          "M_51"
        ]
      },
      {
        "date": "2022-05-07",
        "exposure": 13800,
        "frames": 46,
        "objects": [
          "M_51"
        ]
      }
    ]
  ```
</details>

<details>
    <summary>Catalog: List of directory objects</summary>

  ``/api/get/catalog/list``
  ```json
    [
      {
        "name": "V1405_Cas",
        "title": "Новая Кассиопеи (V1405 Cas)",
        "text": "Вспышка классической новой звезды, представляющая собой взрыв на поверхности белого карлика.",
        "category": "Сверхновые",
        "ra": 351.147,
        "dec": 61.1585
      }
    ]
  ```
</details>

<details>
    <summary>Catalog: Item directory object by name</summary>

  ``/api/get/catalog/item?object=${string}``
  ```json
    {
      "name": "V1405_Cas",
      "title": "Новая Кассиопеи (V1405 Cas)",
      "text": "Вспышка классической новой звезды, представляющая собой взрыв на поверхности белого карлика.",
      "category": "Сверхновые",
      "ra": 351.147,
      "dec": 61.1585
    }
  ```
</details>

<details>
    <summary>Photo: List of all photos (without photo params)</summary>

  ``/api/get/photo/list``
  ```json
  [
      {
        "object": "NGC_896",
        "date": "2022-02-09",
        "file": "NGC_896-710m-2022.02.09",
        "ext": "jpg",
        "author": {
          "name": "Author name",
          "link": ""
        }
      }
  ]
  ```
</details>

<details>
    <summary>Photo: list of all photos of one object (by obj name)</summary>

  ``/api/get/photo/list?object=${string}``
  ```json
  [
      {
        "object": "M_33",
        "date": "2020-12-25",
        "file": "M33-630m-2020.12.25",
        "ext": "jpg",
        "author": {
          "name": "Author name",
          "link": ""
        },
        "parameters": {
          "date": "2020-08-26 23:10:55",
          "exposure": 45367,
          "frames": 214,
          "filesizes": 7016,
          "filters": {
            "Luminance": {
              "exposure": 13203,
              "frames": 45
            },
            "Red": {
              "exposure": 11138,
              "frames": 75
            },
            "Green": {
              "exposure": 8722,
              "frames": 51
            },
            "Blue": {
              "exposure": 7500,
              "frames": 25
            },
            "Ha": {
              "exposure": 4804,
              "frames": 18
            },
            "OIII": {
              "exposure": 0,
              "frames": 0
            },
            "SII": {
              "exposure": 0,
              "frames": 0
            }
          }
        }
      }
  ]
  ```
</details>

<details>
    <summary>Object: list of all captured objects</summary>

  ``/api/get/object/list``
  ```json
    [
      {
        "name": "NGC_925",
        "date": "2021-10-10 00:51:07",
        "exposure": 51300,
        "frames": 171,
        "Luminance": 12900,
        "Red": 14700,
        "Green": 13500,
        "Blue": 10200,
        "Ha": 0,
        "OIII": 0,
        "SII": 0
      }
    ]
  ```
</details>

<details>
    <summary>Object: list of only the names of all captured objects</summary>

  ``/api/get/object/names``
  ```json
    [
      "Vesta_A807_FA",
      "V1405_Cas",
      "UGC_6930",
      "Sh2_132",
      "Sh2_109",
      "Sh2_103",
      "Sh2-168"
    ]
  ```
</details>

<details>
    <summary>Object: Get the params of the captured object (by name)</summary>

  ``/api/get/object/item?object=${string}``
  ```json
    {
      "date": "2020-08-26 23:10:55",
      "exposure": 45367,
      "frames": 214,
      "filesizes": 7016,
      "filters": {
        "Luminance": {
          "exposure": 13203,
          "frames": 45
        },
        "Red": {
          "exposure": 11138,
          "frames": 75
        },
        "Green": {
          "exposure": 8722,
          "frames": 51
        },
        "Blue": {
          "exposure": 7500,
          "frames": 25
        },
        "Ha": {
          "exposure": 4804,
          "frames": 18
        },
        "OIII": {
          "exposure": 0,
          "frames": 0
        },
        "SII": {
          "exposure": 0,
          "frames": 0
        }
      }
    }
  ```
</details>

<details>
  <summary>File: List of all object files (by name)</summary>

  ``/api/get/file/list?object=${string}``
  ```json
    [
      {
        "id": "fe03bc1c2cfd97de1f97edbdd57e3acb",
        "name": "M33_Light_Red_300_secs_2020-08-27T03-45-00_010.fits",
        "date": "2020-08-26 22:39:59",
        "filter": "Red",
        "exposure": 300,
        "temp": -10,
        "offset": 10,
        "gain": 120,
        "dec": 30.5457,
        "ra": 23.4641
      }
    ]
  ```
</details>

----------------------
## Project structure

This project consists of 3 main sections: 

1. [ **firmware** ] Firmware for Arduino microcontroller (AVR), observatory controller control unit.
2. [ **server** ] Backend server. 
3. [ **client** ] Observatory control interface. Written in ReactJS + Redux (use Node and NPM). To debug an application on a local server, you must first install the required dependencies:
  * `yarn install` Installing dependencies.

## How to start
The portal requires hosting with PHP and MySQL support.
1. In the root directory on the hosting, create a folder `api`. Upload files to it from the `backend` repository directory.
2. Install dependencies for PHP (**CodeIgniter v4** framework), to do this, run the command in the `api` root directory (where the backend was loaded and where the `composer.json` file is located):
```bash
php composer.phar install
```
If the hosting does not support composer, then this can be done on the local computer, and after installation, upload all files to the server, to the `api` directory.
3. Create a database, upload the MySQL dump there from the `MySQL_dump_DD.MM.YYY.sql` file, which is in the root of the backend repository. Don't forget to delete the dump from the hosting!
4. In the hosting `api` root directory, rename the `env` file to `.env`. Then edit it and configure the database connection and other parameters:

Observatory location data (for calculating the Moon and Sun):
```
app.appTimezone = Asia/Yekaterinburg
app.timezone  = 5
app.latitude  = 51.7727
app.longitude = 55.0988
```
The URL of the Arduino controller (relay control) and a link to a static image from the observatory's camera (the section will be described later).
```
app.observatory.controller = http://observatory.local/
app.observatory.webcam_1 = http://observatory.local:8010/webcamphoto/image.jpg
app.observatory.webcam_2 = http://observatory.local:8020/webcamphoto/image.jpg
```
For the news section, integration with the social network VK is used. For it to work, you need to generate an application key, a token.
```
app.vkapi.token   =
app.vkapi.domain  =
app.vkapi.version = 5.145
```
Login and password for authorization on the portal (keep it secret) and session lifetime in seconds:
```
app.user_username = login
app.user_password = password
app.user_session_time = 120
```
Set up a MySQL database connection:
```
database.default.hostname = localhost
database.default.database = your_DB
database.default.username = your_USER
database.default.password = your_PASSWORD
database.default.DBDriver = MySQLi
```
5. Installation and configuration of the Portal API is now complete. Now you need to configure and install the interface. On your local computer, in the frontend directory of the repository, rename the `env` file to `.env`. Edit it:
```
NEXT_PUBLIC_API_HOST = 'https://YOUR_API_HOST/api/'
NEXT_PUBLIC_LAT = 51.7
NEXT_PUBLIC_LON = 55.2
```
The `NEXT_PUBLIC_API_HOST` parameter is responsible for determining the URL to the backend server API. If, following the instructions above, you placed the source code in the `api` directory on the server, then the value of this parameter will be: `https://your_domain.com/api/`. For example, you can use my API to test your portal.
6. Now we need to copy the interface. To do this, you must have **nodeJS** installed. In the `frontend` directory run the following commands (after exiting the previous one)
```bash
yarn install
yarn export
```
7. After the last command completes, a ready-made portal will be created in the `frontend/build directory`. All files can be packed and uploaded to the root directory (the `api` directory should already be there) of your site. Happy use :)
