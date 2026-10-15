import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages는 https://<user>.github.io/<repo>/ 아래에서 열리므로 배포 빌드 때 BASE_PATH=/<repo>/ 를 넘김
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
