import { existsSync, unlinkSync } from 'node:fs';

// Laravel uses public/hot to decide whether to load assets from the Vite dev
// server. If this file is left behind after Vite stops, pages hang forever.
if (existsSync('public/hot')) {
    unlinkSync('public/hot');
}
