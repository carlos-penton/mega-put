import * as core from '@actions/core'
import put from './put'
import {resolve} from 'path'

async function run(): Promise<void> {
  try {
    const username: string = core.getInput('mega_username')
    const password: string = core.getInput('mega_password')
    const path: string = core.getInput('local')
    const remote: string = core.getInput('remote')
    if (!username) {
      throw new Error('mega_username is required')
    }
    if (!password) {
      throw new Error('mega_password is required')
    }
    if (!path) {
      throw new Error('path is required')
    }
    if (!remote) {
      throw new Error('remote is required')
    }
    const file = await put(username, password, resolve(path), remote)
    core.notice(`Download link: ${file}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
