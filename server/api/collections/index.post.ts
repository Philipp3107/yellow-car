import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = cleanCollectionName(body?.name)
  const user = await requireUser(typeof body?.userId === 'string' ? body.userId : '')

  const { collection } = await findOrCreateCollection(name, user.userId)
  return collection
})
