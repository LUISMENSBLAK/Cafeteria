export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid CORS issues
    image.src = url
  })

export type LogoCropShape = 'rectangle' | 'square' | 'circle'

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  shape: LogoCropShape = 'rectangle',
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Dimensiones seguras para tickets térmicos de 58 y 80 mm. Un logo
  // cuadrado/circular no debe crecer hasta ocupar todo el ancho del papel.
  const maxWidth = shape === 'rectangle' ? 360 : 220
  const maxHeight = shape === 'rectangle' ? 120 : 220
  const scale = Math.min(1, maxWidth / pixelCrop.width, maxHeight / pixelCrop.height)
  canvas.width = Math.max(1, Math.round(pixelCrop.width * scale))
  canvas.height = Math.max(1, Math.round(pixelCrop.height * scale))

  // Fill with white background (important for thermal printing)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (shape === 'circle') {
    ctx.save()
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2)
    ctx.clip()
  }

  // Copia únicamente el encuadre elegido y lo normaliza sin deformarlo.
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  if (shape === 'circle') ctx.restore()

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file)
      } else {
        reject(new Error('Canvas is empty'))
      }
    }, 'image/jpeg', 0.92)
  })
}
