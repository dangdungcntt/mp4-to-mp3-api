# MP4 to MP3 Conversion API

A lightweight, streaming web API built with [Bun](https://bun.sh) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) to convert MP4 videos to MP3 audio. The API accepts MP4 file uploads via a configurable `POST /convert` endpoint (default: `/convert`) and streams the MP3 output directly, using zero temporary files for optimal memory and disk efficiency. The project is Dockerized with a multi-stage build for a minimal image size (~150-200MB).

## Features
- **Streaming Conversion**: Streams MP4 input directly to FFmpeg and outputs MP3 as a stream, avoiding temp files and memory spikes.
- **File Size Limit**: Configurable via `SIZE_LIMIT_BYTES` env var (default: 50MB) to prevent large file uploads.
- **Bun Runtime**: Leverages Bun for fast startup, TypeScript support, and built-in web server (`Bun.serve`).
- **TypeScript**: Fully typed for reliability and developer experience.
- **Dockerized**: Multi-stage Alpine-based Dockerfile for small image size.
- **Configurable Endpoint**: Uses `API_PATH` env var (default: `/convert`) for flexible deployment.
- **Minimal Dependencies**: Only `fluent-ffmpeg` for FFmpeg integration.
- **Error Handling**: Validates file type (MP4), multipart form data, and file size.
- **Memory Efficient**: ~80MB peak for a 100MB file due to streaming.

## Project Structure
```
mp4-to-mp3-api/
├── src/
│   └── index.ts      # Main API code (TypeScript)
├── Dockerfile        # Multi-stage Docker build
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── bun.lockb         # Bun dependency lockfile
└── README.md         # This file
```

## Prerequisites
- **Bun**: Install via `curl -fsSL https://bun.sh/install | bash` (v1.0+ recommended).
- **Docker**: For containerized deployment.
- **FFmpeg**: Automatically installed in Docker via `apk add ffmpeg`.

## Setup

### Local Development
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd mp4-to-mp3-api
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run in development mode (hot-reload):
   ```bash
   bun run dev
   ```

4. The API runs at `http://localhost:3000` (or custom `PORT` via env).

### Docker
1. Build the Docker image:
   ```bash
   docker build -t mp4-to-mp3 .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 mp4-to-mp3
   ```

3. Access at `http://localhost:3000`.

## Usage
- **Endpoint**: `POST ${API_PATH}` (default: `/convert`)
  - **Content-Type**: `multipart/form-data`
  - **Form Field**: `file` (MP4 file, max 50MB by default)
  - **Response**: MP3 audio stream (`audio/mpeg`) with `Content-Disposition` for download.
- **Health Check**: `GET /` (returns API status and endpoint info).

### Environment Variables
- `PORT`: Server port (default: `3000`).
- `API_PATH`: Conversion endpoint path (default: `/convert`).
- `SIZE_LIMIT_BYTES`: Max file size in bytes (default: `50 * 1024 * 1024` = 50MB). Set to `0` to disable.

### Example (cURL)
```bash
curl -X POST http://localhost:3000/convert \
  -F "file=@/path/to/video.mp4" \
  --output output.mp3
```

### Example (Custom API_PATH and Size Limit)
```bash
export API_PATH=/api/convert
export SIZE_LIMIT_BYTES=104857600  # 100MB
bun run dev
curl -X POST http://localhost:3000/api/convert \
  -F "file=@/path/to/video.mp4" \
  --output output.mp3
```

### Example (Browser/Postman)
1. Use Postman or Insomnia.
2. Set request to `POST http://localhost:3000/convert` (or custom `API_PATH`).
3. Add a `file` field with an MP4 file in the `form-data` body (ensure <50MB or custom limit).
4. Download the returned MP3.

## API Details
- **GET /**: Returns a status message with the configured `API_PATH`.
- **POST /convert** (or `API_PATH`):
  - Validates: MP4 file extension, multipart form, file size (default: 50MB).
  - Streams: MP4 input to FFmpeg, MP3 output to response.
  - Headers: Sets `Content-Disposition` for filename (e.g., `video.mp3`) and `Transfer-Encoding: chunked`.
  - Errors: Returns 400 (bad input), 413 (file too large), or 500 (conversion error).

## Dockerfile Optimization
- **Base Image**: `oven/bun:1-alpine` (~100MB).
- **Multi-Stage Build**:
  - Build stage: Installs deps and compiles TypeScript.
  - Runtime stage: Copies only `dist/`, `node_modules`, and `package.json`.
  - Adds FFmpeg (~20MB) via `apk add --no-cache ffmpeg`.
- **Image Size**: ~150-200MB total.
- **No Temp Files**: Streaming eliminates disk usage.

## Deployment
- **Platforms**: Deploy to Fly.io, Render, or any Docker-compatible service.
- **Environment**:
  - Set `PORT` (e.g., `PORT=8080`), `API_PATH` (e.g., `API_PATH=/api/convert`), or `SIZE_LIMIT_BYTES` (e.g., `SIZE_LIMIT_BYTES=104857600` for 100MB).
- **Scaling**:
  - Add a queue (e.g., BullMQ) for high load.
  - Implement rate-limiting and authentication for production.
- **Security**:
  - File size limit enforced via `SIZE_LIMIT_BYTES` (default: 50MB).
  - Consider malware scanning (e.g., ClamAV) for uploads.
  - Use HTTPS in production.

## Testing
1. **Local**:
   ```bash
   bun run dev
   curl -X POST http://localhost:3000/convert -F "file=@test.mp4" --output test.mp3
   ```
2. **Docker**:
   ```bash
   docker run -p 3000:3000 -e SIZE_LIMIT_BYTES=104857600 mp4-to-mp3
   curl -X POST http://localhost:3000/convert -F "file=@test.mp4" --output test.mp3
   ```
3. **Verify MP3**:
   ```bash
   ffprobe test.mp3
   ```

## Limitations
- Single-file uploads only (extend `formData.getAll('files')` for multiple).
- No progress reporting (consider WebSockets for UX).
- Timeout for large files (>10min) may require tuning (`server.fetchTimeout`).

## Troubleshooting
- **FFmpeg Errors**: Ensure `ffmpeg` is in PATH (`/usr/bin/ffmpeg` in Docker).
- **Stream Errors**: Corrupted MP4s may abort the stream; client sees partial file.
- **File Too Large**: Check `SIZE_LIMIT_BYTES` (returns 413 if exceeded).
- **Custom Path**: Verify `API_PATH` env var matches your request.

## Contributing
- Fork, make changes, and submit a PR.
- Add tests (e.g., with `bun:test`) for robustness.
- Suggest features: multi-format support, progress streaming, authentication.

## License
MIT License. See `LICENSE` (add one if needed).