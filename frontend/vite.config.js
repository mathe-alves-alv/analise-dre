import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // ou '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Remover ou comentar 'base: '/''. O padrão '/' é geralmente o que queremos.
    // Se houver um problema com a raiz do Netlify, o Vite pode estar gerando URLs absolutas.
    // base: '/', 
    build: {
        outDir: 'dist',
        assetsDir: 'assets', // Garante que os assets (CSS, JS, imagens) fiquem em uma pasta 'assets'
        rollupOptions: {
            output: {
                // Assegura que o index.html gerado aponte para os assets corretamente
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
    },
});