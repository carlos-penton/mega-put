import {basename, resolve, dirname, join} from 'node:path'
import {Storage} from 'megajs'
import type {Nullable} from 'megajs'
import tar from 'tar'
import {createReadStream} from 'fs'

declare module 'megajs' {
  interface uploadOpts {
    allowUploadBuffering?: boolean
  }
}

export async function createTar(
  path: string,
  fileName?: string
): Promise<string> {
  const cwd = dirname(path)
  const file = join(cwd, `${fileName || basename(path)}.tar`)
  await tar.c(
    {
      file,
      cwd
    },
    [path]
  )
  return resolve(file)
}

export async function upload(
  email: string,
  password: string,
  localFile: string,
  remoteFile: string
): Promise<Nullable<string>> {
  const storage = await new Storage({
    email,
    password
  }).ready
  const localStream = createReadStream(localFile)
  const remoteStream = storage.upload({
    name: remoteFile,
    allowUploadBuffering: true
  })
  localStream.pipe(remoteStream)
  const file = await remoteStream.complete
  const link = await file.link(false)
  await storage.close()
  return link
}

export default async function put(
  email: string,
  password: string,
  localPath: string,
  remotePath: string
): Promise<string> {
  const compressed = await createTar(localPath)
  const remote = await upload(email, password, compressed, remotePath)
  if (!remote) {
    throw new Error('Upload failed')
  }
  return remote
}
