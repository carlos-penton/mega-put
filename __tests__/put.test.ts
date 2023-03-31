import {describe, it, expect, afterAll} from '@jest/globals'
import {basename, join, resolve, sep} from 'node:path'
import {existsSync} from 'node:fs'
import put, {createTar, upload} from '../src/put'
import {writeFile, rm, mkdir, readFile} from 'fs/promises'
import tar from 'tar'
import type {ReadEntry} from 'tar'
import * as dotenv from 'dotenv'

async function removeTmpDir(): Promise<void> {
  if (existsSync('.tmp')) {
    await rm('.tmp', {force: true, recursive: true})
  }
}

async function createFile(subdir?: string): Promise<string> {
  let path = '.tmp'
  if (subdir) {
    path = join(path, subdir)
  }
  await mkdir(path, {recursive: true})
  const file = join(path, Date.now().toString())
  await writeFile(file, 'Hello world!')
  return file
}

// eslint-disable-next-line jest/require-top-level-describe
afterAll(removeTmpDir)

describe('compression tests', () => {
  it('compresses a single file', async () => {
    expect.assertions(3)
    const file = resolve(await createFile())
    const expected = `${file}.tar`

    await expect(createTar(file)).resolves.toStrictEqual(expected)
    const entries: string[] = []
    await tar.t({
      file: expected,
      onentry: (entry: ReadEntry) => entries.push(`${entry.path}`)
    })
    expect(entries).toHaveLength(1)
    expect(file.endsWith(entries[0])).toBeTruthy()
  })

  it('compresses a directory', async () => {
    expect.assertions(5)
    const dir = Date.now().toString()
    const dirPath = resolve(join('.tmp', dir))
    const file1 = resolve(await createFile(dir))
    const file2 = resolve(await createFile(dir))
    const expected = `${dirPath}.tar`

    await expect(createTar(dirPath)).resolves.toStrictEqual(expected)
    const entries: string[] = []
    await tar.t({
      file: expected,
      onentry: (entry: ReadEntry) => {
        entries.push(`${entry.path}`)
      }
    })
    expect(entries).toHaveLength(3)
    expect(`${dirPath}${sep}`.endsWith(entries[0])).toBeTruthy()
    expect(file1.endsWith(entries[1])).toBeTruthy()
    expect(file2.endsWith(entries[2])).toBeTruthy()
  })
})

describe('upload tests', () => {
  it(
    'uploads a single file',
    async () => {
      expect.assertions(1)
      const env: {MEGA_USERNAME: string; MEGA_PASSWORD: string} = dotenv.parse(
        await readFile(join(__dirname, '..', '.env.test'))
      )
      const file = await createFile()
      const uploaded = await upload(
        env.MEGA_USERNAME,
        env.MEGA_PASSWORD,
        file,
        `test_${basename(file)}`
      )
      expect(uploaded).toBeTruthy()
    },
    5 * 60 * 1e3
  )
})

describe('e2e tests', () => {
  it(
    'uploads a file',
    async () => {
      expect.assertions(1)
      const env: {MEGA_USERNAME: string; MEGA_PASSWORD: string} = dotenv.parse(
        await readFile(join(__dirname, '..', '.env.test'))
      )
      const file = await createFile()
      const expected = basename(`${file}.tar`)
      const uploaded = await put(
        env.MEGA_USERNAME,
        env.MEGA_PASSWORD,
        resolve(file),
        expected
      )
      expect(uploaded).toBeTruthy()
    },
    5 * 60 * 1e3
  )
  it(
    'uploads a dir',
    async () => {
      expect.assertions(1)
      const env: {MEGA_USERNAME: string; MEGA_PASSWORD: string} = dotenv.parse(
        await readFile(join(__dirname, '..', '.env.test'))
      )
      const dir = Date.now().toString()
      await createFile(dir)
      await createFile(dir)
      const expected = basename(`${dir}.tar`)
      const uploaded = await put(
        env.MEGA_USERNAME,
        env.MEGA_PASSWORD,
        resolve(join('.tmp', dir)),
        expected
      )
      expect(uploaded).toBeTruthy()
    },
    5 * 60 * 1e3
  )
})
