import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

const API_PATH = Bun.env.API_PATH || "/convert";
const SIZE_LIMIT_BYTES = Number(Bun.env.SIZE_LIMIT_BYTES || 50 * 1024 * 1024);

async function handleConvert(req: Request): Promise<Response> {
    try {
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('multipart/form-data')) {
            return new Response('Expected multipart/form-data', { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!(file instanceof File) || !file.name.endsWith('.mp4')) {
            return new Response('Must upload an MP4 file', { status: 400 });
        }

        if (SIZE_LIMIT_BYTES > 0 && file.size > SIZE_LIMIT_BYTES) {
            return new Response(`File too large (max ${SIZE_LIMIT_BYTES / 1024 / 1024}MB)`, { status: 413 });
        }

        const output = ffmpeg(Readable.from(file.stream()))
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .format('mp3')
            .on('error', (err) => {
                console.error('FFmpeg Error:', err);
            })
            .pipe();

        return new Response(output, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${file.name.replaceAll('.mp4', '.mp3')}"`,
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (err) {
        return new Response(`Error: ${(err as Error).message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}


const server = Bun.serve({
    port: Bun.env.PORT || 3000,
    async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === '/' && req.method === 'GET') {
            return new Response(`MP4 to MP3 API. POST ${API_PATH} with multipart/form-data file=your.mp4`, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        if (url.pathname === API_PATH && req.method === 'POST') {
            return handleConvert(req);
        }

        return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    },
});

console.log(`Server running on http://0.0.0.0:${server.port}`);