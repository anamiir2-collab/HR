import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// مهم: غيّر المسار إلى اسم مستودع GitHub الفعلي قبل النشر.
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPOSITORY_NAME/',
});
