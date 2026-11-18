import { Image, type ImageProps } from 'expo-image';
import { useContentImage } from './useContentImage';
import { MissingImage } from './MissingImage';

type Props = ImageProps & { source: { uri: string } };
export function ContentImage({ source, ...props }: Props) {
  const { uri, loading } = useContentImage(source.uri);
  return uri ? <Image {...props} source={{ uri }} /> : <MissingImage reference={source.uri} loading={loading} />;
}
