import OSS from 'ali-oss'

const VIDEO_IDS = [
  'cam-e01',
  'cam-e02',
  'cam-e05',
  'cam-h01',
  'cam-h02',
  'cam-r01',
  'cam-r02',
  'cam-s01',
  'cam-s02',
  'cam-w11',
  'cam-w12',
  'cam-w21',
  'cam-w22',
]

const SIGNED_URL_EXPIRES_SECONDS = 4 * 60 * 60

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  })
}

export default async () => {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
  const bucket = process.env.OSS_BUCKET || 'ztvideos'
  const region = process.env.OSS_REGION || 'oss-cn-shanghai'
  const prefix = (process.env.OSS_VIDEO_PREFIX || 'chint-dashboard/videos')
    .replace(/^\/+|\/+$/g, '')

  if (!accessKeyId || !accessKeySecret) {
    console.error('OSS signing credentials are not configured.')
    return json({ message: 'Video service is not configured.' }, 500)
  }

  try {
    const client = new OSS({
      accessKeyId,
      accessKeySecret,
      bucket,
      region,
      secure: true,
      authorizationV4: true,
    })

    const entries = await Promise.all(
      VIDEO_IDS.map(async (id) => {
        const objectName = `${prefix}/${id}.mp4`
        const signedUrl = await client.signatureUrlV4(
          'GET',
          SIGNED_URL_EXPIRES_SECONDS,
          undefined,
          objectName,
        )
        return [id, signedUrl]
      }),
    )

    return json({
      urls: Object.fromEntries(entries),
      expiresIn: SIGNED_URL_EXPIRES_SECONDS,
    })
  } catch (error) {
    console.error('Failed to sign OSS video URLs.', error)
    return json({ message: 'Video URLs could not be generated.' }, 502)
  }
}
