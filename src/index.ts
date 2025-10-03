import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile } from 'fs/promises';

const TEMP_DIR = tmpdir();
await mkdir(TEMP_DIR, { recursive: true });

const server = Bun.serve({
    port: process.env.PORT || 3000,
    async fetch(req) {
        const url = new URL(req.url);

        // GET / - Basic status
        if (url.pathname === '/' && req.method === 'GET') {
            return new Response('MP4 to MP3 API. POST /convert with multipart/form-data file=your.mp4', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        // POST /convert - MP4 to MP3
        if (url.pathname === '/convert' && req.method === 'POST') {
            return handleConvert(req);
        }

        // 404 for all other routes
        return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    },
});

async function handleConvert(req: Request): Promise<Response> {
    try {
        // Check content type
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('multipart/form-data')) {
            return new Response('Expected multipart/form-data', { status: 400 });
        }

        // Parse form data
        const formData = await req.formData();
        const file = formData.get('file');
        if (!(file instanceof File) || !file.name.endsWith('.mp4')) {
            return new Response('Must upload an MP4 file', { status: 400 });
        }

        // Save MP4 to temp file
        const inputPath = join(TEMP_DIR, `input_${Date.now()}.mp4`);
        const outputPath = join(TEMP_DIR, `output_${Date.now()}.mp3`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(inputPath, buffer);

        // Convert to MP3
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .format('mp3')
                .on('error', reject)
                .on('end', () => resolve())
                .save(outputPath);
        });

        return new Response(Bun.file(outputPath));
    } catch (err) {
        return new Response(`Error: ${(err as Error).message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

console.log(`Server running on http://localhost:${server.port}`);