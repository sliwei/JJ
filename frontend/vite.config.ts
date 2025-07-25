import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import dayjs from 'dayjs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

import pkg from './package.json'

export default defineConfig(({ mode, command }) => {
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd()),
    VITE_APP_TIME: `v.${pkg.version}.${dayjs().format('YY.MMDD.HHmm')}`
  }

  console.log('VITE_APP_ENV:', process.env.VITE_APP_ENV)
  console.log('VITE_APP_TIME:', process.env.VITE_APP_TIME)

  const isProd = process.env.VITE_APP_ENV && process.env.VITE_APP_ENV !== 'dev'
  const plugins = [react(), tailwindcss()]
  const base = '/'
  // if (isProd) {
  // }
  return {
    // 部署生产环境和开发环境下的URL。
    // 默认情况下，vite 会假设你的应用是被部署在一个域名的根路径上
    // 例如 https://www.ruoyi.vip/。如果应用被部署在一个子路径上，你就需要用这个选项指定这个子路径。例如，如果你的应用被部署在 https://www.ruoyi.vip/admin/，则设置 baseUrl 为 /admin/。
    base,
    build: {
      sourcemap: process.env.VITE_APP_ENV !== 'live'
    },
    plugins,
    resolve: {
      // https://cn.vitejs.dev/config/#resolve-alias
      alias: {
        // 设置路径
        '~': path.resolve(__dirname, './'),
        // 设置别名
        '@': path.resolve(__dirname, './src')
      },
      // https://cn.vitejs.dev/config/#resolve-extensions
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    // vite 相关配置
    server: {
      port: 3000,
      host: true,
      open: true,
      // 添加 HMR 配置
      hmr: {
        overlay: false // 禁用报错浮层，提高性能
      },
      // 调整开发环境 sourcemap 配置
      sourcemap: 'inline', // 更快的 sourcemap 生成方式
      proxy: {
        '^/core_api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/core_api/, '')
        }
      }
    }
  }
})
