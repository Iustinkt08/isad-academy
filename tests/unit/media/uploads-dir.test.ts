import path from 'path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveUploadsDir } from '../../../src/lib/media/uploadsDir'

/**
 * Regresia pe care o blochează fișierul ăsta (2026-08-07): calea uploadurilor era calculată
 * din `process.cwd()`. Sub Passenger, cwd = home-ul contului, nu rădăcina aplicației, deci
 * TOATE fișierele răspundeau 404 în producție — blogul fără imagini — în timp ce local totul
 * părea în regulă, pentru că în dev cele două coincid.
 */
describe('resolveUploadsDir', () => {
  let argv: string[]
  let envDir: string | undefined

  beforeEach(() => {
    argv = process.argv
    envDir = process.env.PAYLOAD_MEDIA_DIR
    delete process.env.PAYLOAD_MEDIA_DIR
  })

  afterEach(() => {
    process.argv = argv
    if (envDir === undefined) delete process.env.PAYLOAD_MEDIA_DIR
    else process.env.PAYLOAD_MEDIA_DIR = envDir
  })

  it('anchors on server.js, NOT on the working directory (the production bug)', () => {
    // Exact condiția din producție: cwd e altundeva decât aplicația.
    process.argv = ['/usr/bin/node', '/home/isadacad/apps/isad/server.js']

    expect(resolveUploadsDir()).toBe(path.resolve('/home/isadacad/apps/isad/media'))
  })

  it('falls back to the working directory when not running the standalone server', () => {
    // `npm run dev` / scripturi: cwd E rădăcina proiectului, deci e reperul corect.
    process.argv = ['/usr/bin/node', '/some/tool/cli.js']

    expect(resolveUploadsDir()).toBe(path.resolve(process.cwd(), 'media'))
  })

  it('lets PAYLOAD_MEDIA_DIR win over everything else', () => {
    // Portița pentru cazul în care hostingul mai mută ceva — fără rebuild.
    process.env.PAYLOAD_MEDIA_DIR = '/var/uploads/isad'
    process.argv = ['/usr/bin/node', '/home/isadacad/apps/isad/server.js']

    expect(resolveUploadsDir()).toBe('/var/uploads/isad')
  })

  it('resolves a relative PAYLOAD_MEDIA_DIR to an absolute path', () => {
    process.env.PAYLOAD_MEDIA_DIR = './uploads'

    expect(path.isAbsolute(resolveUploadsDir())).toBe(true)
  })
})
