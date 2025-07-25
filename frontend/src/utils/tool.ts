import axios from 'axios'

// 重新排序
export const reorder = <T>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

// 地址参数
export const getUrlParam = (name: string, url?: string) => {
  const u = url || window.location.href,
    reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)'),
    r = u.substring(u.indexOf('?') + 1).match(reg)
  return r != null ? decodeURI(r[2]) : ''
}

// 下载文件
export const downloadFile = (blob: Blob | MediaSource, filename: string) => {
  const a = window.document.createElement('a')
  a.download = `${decodeURI(filename)}`
  a.href = window.URL.createObjectURL(blob)
  a.click()
  window.URL.revokeObjectURL(a.href)
}

// 防抖
export const debounce = (func: (...args: unknown[]) => void, time: number | undefined) => {
  let timer: number | NodeJS.Timeout | undefined
  return (...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      func(...args)
    }, time)
  }
}

// 节流
export const throttle = (callback: (...args: unknown[]) => void, wait = 3000) => {
  let timer: number | NodeJS.Timeout | undefined
  let startTime: number
  return (...args: unknown[]) => {
    const now = +new Date()
    if (startTime && now < startTime + wait) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        startTime = now
        callback(...args)
      }, wait)
    } else {
      startTime = now
      callback(...args)
    }
  }
}

// 强行睡觉,默认800
export const sleep = (time: number = 800) => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(true)
    }, time)
  )
}

// 生成uuid
export function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// dataURL to file
export const dataURLToFile = (dataURL: string, filename: string) => {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

// img url to base64
export const convertImgToBase64 = async (url: string): Promise<string> => {
  const response = await axios({ url, responseType: 'blob' })
  const blob = response.data
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// get video width height with retry mechanism
export const getVideoInfo = async (url: string, retries: number = 3): Promise<{ width: number; height: number }> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const video = document.createElement('video')

        // 设置超时机制，防止视频加载卡住
        const timeout = setTimeout(() => {
          reject(new Error(`Video load timeout: ${url} (attempt ${attempt}/${retries})`))
        }, 10000) // 10秒超时，视频可能比图片需要更长时间

        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          resolve({ width: video.videoWidth, height: video.videoHeight })
        }

        video.onerror = () => {
          clearTimeout(timeout)
          reject(new Error(`Failed to load video: ${url} (attempt ${attempt}/${retries})`))
        }

        // 设置跨域属性，避免某些视频加载问题
        video.crossOrigin = 'anonymous'
        video.src = url
        video.load() // 开始加载视频元数据
      })
    } catch (error) {
      console.warn(`视频加载失败 (尝试 ${attempt}/${retries}):`, error)

      // 如果不是最后一次尝试，等待一段时间后重试
      if (attempt < retries) {
        await sleep(1000 * attempt) // 递增等待时间：1s, 2s, 3s...
      } else {
        // 最后一次尝试失败，抛出错误
        throw error
      }
    }
  }

  // 这行代码理论上不会执行到，但为了类型安全
  throw new Error(`Failed to load video after ${retries} attempts: ${url}`)
}

// get img width height with retry mechanism
export const getImgInfo = async (url: string, retries: number = 3): Promise<{ width: number; height: number }> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image()

        // 设置超时机制，防止图片加载卡住
        const timeout = setTimeout(() => {
          reject(new Error(`Image load timeout: ${url} (attempt ${attempt}/${retries})`))
        }, 8000) // 8秒超时，给重试留出时间

        img.onload = () => {
          clearTimeout(timeout)
          resolve({ width: img.width, height: img.height })
        }

        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error(`Failed to load image: ${url} (attempt ${attempt}/${retries})`))
        }

        // 设置跨域属性，避免某些图片加载问题
        img.crossOrigin = 'anonymous'
        img.src = url
      })
    } catch (error) {
      console.warn(`图片加载失败 (尝试 ${attempt}/${retries}):`, error)

      // 如果不是最后一次尝试，等待一段时间后重试
      if (attempt < retries) {
        await sleep(1000 * attempt) // 递增等待时间：1s, 2s, 3s...
      } else {
        // 最后一次尝试失败，抛出错误
        throw error
      }
    }
  }

  // 这行代码理论上不会执行到，但为了类型安全
  throw new Error(`Failed to load image after ${retries} attempts: ${url}`)
}

// 检测文件类型
export const getFileType = (url: string): 'image' | 'video' | 'unknown' => {
  const extension = url.split('.').pop()?.toLowerCase()

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'm4v']

  if (extension && imageExtensions.includes(extension)) {
    return 'image'
  } else if (extension && videoExtensions.includes(extension)) {
    return 'video'
  }

  return 'unknown'
}

// 通用媒体信息获取函数，支持图片和视频
export const getMediaInfo = async (
  url: string,
  retries: number = 3
): Promise<{ width: number; height: number; type: 'image' | 'video' }> => {
  const fileType = getFileType(url)

  if (fileType === 'video') {
    const videoInfo = await getVideoInfo(url, retries)
    return { ...videoInfo, type: 'video' }
  } else {
    // 默认按图片处理
    const imgInfo = await getImgInfo(url, retries)
    return { ...imgInfo, type: 'image' }
  }
}

// blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.readAsDataURL(blob)
  })
}

// get base64 width height
export const getBase64Info = async (base64: string): Promise<{ width: number; height: number; img: HTMLImageElement }> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = base64
    img.onload = () => {
      resolve({ width: img.width, height: img.height, img })
    }
  })
}

// base64 mp3 to file
export const base64ToFile = (base64: string, filename: string) => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

// base64 img change size, Long side=512,Short side=auto
export const resizeBase64Img = async (
  base64: string,
  maxSide: number = 512
): Promise<{ width: number; height: number; base64: string }> => {
  const info = await getBase64Info(base64)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to get canvas context')
  }

  const ratio = info.width > info.height ? maxSide / info.width : maxSide / info.height

  canvas.width = info.width * ratio
  canvas.height = info.height * ratio

  ctx.drawImage(info.img, 0, 0, canvas.width, canvas.height)
  const base64Url = canvas.toDataURL()
  return { width: canvas.width, height: canvas.height, base64: base64Url }
}

// base64 img change size, Long side=512,Short side=auto
export const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  // 使用更现代的方法检测iPad
  const isiPad = navigator.userAgent.match(/(iPad)/) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  if (/tablet|ipad|playbook|silk|kindle/i.test(userAgent) || isiPad) {
    return 'tablet'
  } else if (/mobile|android|touch|webos|hpwos/i.test(userAgent)) {
    return 'mobile'
  } else {
    return 'desktop'
  }
}

export const deviceBrowser = () => {
  const ua = navigator.userAgent.toLocaleLowerCase()
  // Safari
  // chrome
  // firefox
  // opera
  // IE
  // Edge
  // QQBrowser
  // UC
  // WeChat
  // Android
  // iOS
  // unknown
  if (ua.indexOf('micromessenger') > -1) {
    return 'WeChat'
  }
  if (ua.indexOf('qqbrowser') > -1) {
    return 'QQBrowser'
  }
  if (ua.indexOf('ucbrowser') > -1) {
    return 'UC'
  }
  if (ua.indexOf('edge') > -1) {
    return 'Edge'
  }
  if (ua.indexOf('opr') > -1 || ua.indexOf('opera') > -1) {
    return 'opera'
  }
  if (ua.indexOf('chrome') > -1) {
    return 'chrome'
  }
  if (ua.indexOf('safari') > -1) {
    return 'Safari'
  }
  if (ua.indexOf('firefox') > -1) {
    return 'firefox'
  }
  if (ua.indexOf('trident') > -1 || ua.indexOf('msie') > -1) {
    return 'IE'
  }
  if (ua.indexOf('android') > -1) {
    return 'Android'
  }
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS'
  }
  return 'unknown'
}

if (!localStorage.uuid) {
  localStorage.uuid = getUUID()
}

export const borwserEnv = {
  isWechat: /micromessenger/.test(navigator.userAgent.toLowerCase()),
  isAndroid: /android/.test(navigator.userAgent.toLowerCase()),
  isIOS: /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
}

// hex to rgb
export const hexToRgb = (hex: string) => {
  const rgb = []
  for (let i = 1; i < 7; i += 2) {
    rgb.push(parseInt('0x' + hex.slice(i, i + 2)))
  }
  return rgb
}

export const downloadFileByUrl = (url: string) => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a')
        const url = window.URL.createObjectURL(blob)
        a.href = url
        a.download = url.split('/').pop() || 'download'
        a.click()
        resolve(true)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export const clearLoginInfo = () => {
  localStorage.removeItem('token')
}
