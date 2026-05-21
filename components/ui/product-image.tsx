import Image, { type ImageProps } from 'next/image'
import { resolveMediaUrl, shouldUnoptimizeMedia } from '@/lib/media'

type ProductImageProps = Omit<ImageProps, 'src'> & {
  src: string | undefined | null
}

/** Превью товара/заказа: /uploads без оптимизатора Next (как в каталоге). */
export function ProductImage({ src, alt = '', ...props }: ProductImageProps) {
  return (
    <Image
      src={resolveMediaUrl(src)}
      alt={alt}
      unoptimized={shouldUnoptimizeMedia(src)}
      {...props}
    />
  )
}
