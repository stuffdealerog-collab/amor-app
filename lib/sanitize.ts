const MAX_MESSAGE = 2000
const MAX_NAME = 30
const MAX_BIO = 200

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

export function sanitizeMessage(str: string): string {
  return stripTags(str).trim().slice(0, MAX_MESSAGE)
}

export function sanitizeName(str: string): string {
  return stripTags(str).trim().slice(0, MAX_NAME)
}

export function sanitizeBio(str: string): string {
  return stripTags(str).trim().slice(0, MAX_BIO)
}

export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let last = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - last < ms) return
    last = now
    return fn(...args)
  }) as T
}
