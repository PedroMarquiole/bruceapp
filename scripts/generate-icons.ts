/**
 * Gera os ícones PNG do PWA a partir da marca em SVG (desenho original do Bruceapp).
 * Uso: node --experimental-strip-types scripts/generate-icons.ts
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const mark = `<g fill="#F2C94C"><rect x="148" y="116" width="64" height="280" rx="10"/><path d="M232 116h86a63 63 0 0 1 0 126h-86z"/><path d="M232 262h100a67 67 0 0 1 0 134H232z"/></g>`

function svg(size: number, inset: number): string {
  // inset < 1 encolhe a marca para a área segura dos ícones "maskable".
  const t = (512 * (1 - inset)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#090A0D"/><g transform="translate(${t} ${t}) scale(${inset})">${mark}</g></svg>`
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, inset: 1 },
  { file: 'public/icons/icon-512.png', size: 512, inset: 1 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, inset: 0.72 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, inset: 0.86 },
]

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? undefined,
})
const page = await browser.newPage()
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(`<html><body style="margin:0">${svg(t.size, t.inset)}</body></html>`)
  await page.screenshot({ path: t.file, clip: { x: 0, y: 0, width: t.size, height: t.size } })
  console.warn(`gerado ${t.file} (${readFileSync(t.file).length} bytes)`)
}
await browser.close()
