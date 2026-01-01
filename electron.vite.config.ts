import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
    main: {
        build: {
            outDir: 'dist/main',
            rollupOptions: {
                external: ['electron', 'electron-store']
            }
        }
    },
    preload: {
        build: {
            outDir: 'dist/preload',
            rollupOptions: {
                external: ['electron'],
                input: {
                    index: resolve(__dirname, 'src/preload/index.ts'),
                    hud: resolve(__dirname, 'src/preload/hud.ts'),
                    settings: resolve(__dirname, 'src/preload/settings.ts'),
                    onboarding: resolve(__dirname, 'src/preload/onboarding.ts')
                }
            }
        }
    },
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        build: {
            outDir: resolve(__dirname, 'dist/renderer'),
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'src/renderer/index.html'),
                    settings: resolve(__dirname, 'src/renderer/settings/index.html'),
                    onboarding: resolve(__dirname, 'src/renderer/onboarding/index.html')
                }
            }
        }
    }
});
