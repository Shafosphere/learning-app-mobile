import { useEffect, useState, useSyncExternalStore } from 'react';
import { getImageRevision, resolveImageUri, subscribeImages } from './images';

export function useContentImage(reference: string) {
  const revision = useSyncExternalStore(subscribeImages, getImageRevision, getImageRevision);
  const isAsset = reference.startsWith('asset://');
  const [result, setResult] = useState<{ reference: string; revision: number; uri: string | null } | null>(null);
  useEffect(() => {
    if (!isAsset) return;
    let active = true;
    void resolveImageUri(reference).then(uri => { if (active) setResult({ reference, revision, uri }); });
    return () => { active = false; };
  }, [reference, revision, isAsset]);
  if (!isAsset) return { uri: reference, loading: false };
  const current = result?.reference === reference && result.revision === revision;
  return { uri: current ? result.uri : null, loading: !current };
}
