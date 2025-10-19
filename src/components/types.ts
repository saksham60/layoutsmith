export type FigmaFile = {
  id: string
  name: string
  thumbnail: string | null
  lastModified: string
}

export type ComponentItem = {
  id: number
  name: string
  type: 'Component' | 'Section'
  variants: number
  code: string
}
