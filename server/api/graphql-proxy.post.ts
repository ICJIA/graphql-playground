export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { endpoint, query, variables, headers: customHeaders } = body

  if (!endpoint || typeof endpoint !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid endpoint URL' })
  }

  try {
    new URL(endpoint)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid endpoint URL format' })
  }

  if (!query || typeof query !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid query' })
  }

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  }

  try {
    const response = await $fetch(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: {
        query,
        variables: variables || undefined
      },
      timeout: 30000
    })

    return response
  } catch (error: any) {
    if (error?.data) {
      return error.data
    }

    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.message || 'Failed to reach the GraphQL endpoint'
    })
  }
})
