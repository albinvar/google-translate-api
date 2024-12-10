---

# 🌐 Google Translate API Wrapper 🚀

[![Docker Hub](https://img.shields.io/badge/docker-hub-blue)](https://hub.docker.com/r/albinvar/translation-api)
![Node.js](https://img.shields.io/badge/Node.js-18-green?logo=node.js)
![SQLite](https://img.shields.io/badge/SQLite-persistent%20storage-blue?logo=sqlite)
![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-orange)

A **lightweight wrapper for Google Translate API** 🌍, powered by the amazing [google-translate-api](https://github.com/vitalets/google-translate-api) library. Built for developers who want a simple yet powerful translation tool with stats and proxy support.

---

> :warning: **This project is unofficial**. To ensure legal compliance and production-ready reliability, use the official Google Translate API: [Google Cloud Translate](https://cloud.google.com/translate?hl=en). **This wrapper is intended for pet projects, prototyping, and lightweight applications.** 

---

## ✨ Features

- 🌍 **Auto Language Detection**: Automatically detect the source language of the text.
- 🔄 **Translation**: Translate text into any supported language.
- 📝 **Transliteration**: Convert text into scripts of the target language (where supported).
- 🔗 **Proxy Support**: Automatically retries failed translations with public proxies.
- 📊 **Usage Statistics**:
  - Total requests and per-language stats
  - Characters translated
  - Success and failure rates
  - IP-based request counts
- 🛠️ **Swagger UI**: Test and explore endpoints interactively.
- 🔐 **Secure API**: Bearer token-based authentication for safe access.
- 💾 **Persistent Storage**: SQLite-backed stats tracking, Docker volume support included.
- 🐳 **Dockerized**: Seamless deployment with Docker for production-ready setups.

---

## 🗣️ Supported Languages

This project supports all languages listed by Google Translate. You can find the complete list [here](https://cloud.google.com/translate/docs/languages).

Examples:

| Language Code | Language         |
|---------------|------------------|
| `en`          | English          |
| `es`          | Spanish          |
| `zh`          | Chinese (Simplified) |
| `ar`          | Arabic           |
| `ru`          | Russian          |
| `hi`          | Hindi            |
| `ml`          | Malayalam        |

And [more....](https://cloud.google.com/translate/docs/languages).

---

## 🚀 Getting Started

### Prerequisites

- Docker installed (recommended for production).
- Node.js and PNPM installed (for local development).

---

### 🐳 Running with Docker

1. **Pull the Docker Image**:
   ```bash
   docker pull albinvar/translation-api
   ```

2. **Run the Container**:
   ```bash
   docker run -d \
   -p 3000:3000 \
   -e API_TOKEN=your-token \
   -v translation-data:/usr/src/app/data \
   --name translation-api \
   albinvar/translation-api
   ```

3. **Access the API**:
   - Swagger Docs: [http://localhost:3000/docs](http://localhost:3000/docs)
   - API Endpoints: `/v1/translate`, `/v1/stats`, `/v1/proxies`

---

### 🖥️ Running Locally

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/albinvar/google-translate-api.git
   cd google-translate-api
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the Server**:
   ```bash
   pnpm start
   ```

4. **Access the API**:
   - Swagger Docs: [http://localhost:3000/docs](http://localhost:3000/docs)

---

### 🆙 Upgrade Docker Instance

Upgrading your **Translation API** Docker instance is simple and ensures no data is lost during the process. Follow these steps:

  1. Download the latest Docker image from Docker Hub:
  ```bash
  docker pull albinvar/translation-api
  ```

  2. Stop the currently running container:
  ```bash
  docker stop translation-api
  ```

  3. Remove the old container while keeping the named volume intact:
  ```bash
  docker rm translation-api
  ```

  4. Start a new container using the updated image and reattach the existing volume:
  ```bash
  docker run -d \
    --name translation-api \
    -p 3000:3000 \
    -e API_TOKEN=your-token \
    -v translation-data:/usr/src/app/data \
    albinvar/translation-api:latest
  ```

---

## 📖 API Endpoints

### `/v1/translate` [POST]
Translate text into the desired language with proxy and stats tracking.

- **Headers**: `Authorization: Bearer <API_TOKEN>`
- **Request Body**:
  ```json
  {
    "text": "Hello",
    "lang": "es"
  }
  ```
- **Response**:
  ```json
  {
    "translatedText": "Hola",
    "proxyEnabled": false,
    "proxyIp": null,
    "retries": 0
  }
  ```

---

### `/v1/stats` [GET]
Retrieve server statistics, including global, per-language, and per-IP stats.

- **Headers**: `Authorization: Bearer <API_TOKEN>`
- **Response**:
  ```json
  {
    "success": true,
    "global_stats": {
      "total_requests": 120,
      "successful_requests": 110,
      "failed_requests": 10,
      "total_characters": 5000,
      "unique_ips": 5
    },
    "per_language_stats": [
      {
        "language": "en",
        "total_requests": 60,
        "successful_requests": 55,
        "failed_requests": 5,
        "total_characters": 1500
      }
    ],
    "per_ip_stats": [
      {
        "ip": "192.168.1.1",
        "request_count": 15,
        "total_characters": 350
      }
    ]
  }
  ```

---

### `/v1/proxies` [GET]
Fetch the list of free proxies used for translations.

- **Headers**: `Authorization: Bearer <API_TOKEN>`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "ip": "103.152.112.120",
        "port": "80",
        "country": "United States"
      }
    ]
  }
  ```

---

## 🔧 Configuration

Set up your server using the following environment variables:

| Variable      | Default Value     | Description                                |
|---------------|-------------------|--------------------------------------------|
| `PORT`        | `3000`            | The port where the server will run.        |
| `API_TOKEN`   | `you-are-lucky`   | Bearer token for API authentication.       |

---

## 📦 Deployment

### Docker Compose
Here’s an example `docker-compose.yml`:
```yaml
version: "3.8"
services:
  translation-api:
    image: albinvar/translation-api
    container_name: translation-api
    ports:
      - "3000:3000"
    environment:
      - API_TOKEN=your-token
    volumes:
      - ./data:/usr/src/app/data
```
Deploy it with:
```bash
docker-compose up -d
```

---

## 🤝 Contributing

We welcome contributions! Fork the repo, create a branch, and submit your PR. 🚀

---

## ⚖️ License

Licensed under the [MIT License](LICENSE).

---

🌟 **Disclaimer**: This project is unofficial and intended for lightweight, non-critical applications. For commercial or production use, consider the official [Google Cloud Translate API](https://cloud.google.com/translate?hl=en). Use responsibly!
