import { useSyncExternalStore, useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeSettings } from '@/src/contexts/SettingsContext';
import { parseImageReference } from './catalog';
import { cancelPack, confirmPackDownload, downloadPack, getPackDownload, refreshPack, subscribePackDownloads } from './packDownloads';
import { invalidateImages, usesImagePAD } from './images';

function RecoveryButton({ packName }: { packName: string }) {
  const { t } = useTranslation();
  const { colors } = useThemeSettings();
  const state = useSyncExternalStore(subscribePackDownloads, useCallback(() => getPackDownload(packName), [packName]));
  const busy = ['pending', 'downloading', 'transferring'].includes(state.phase);
  const key = busy ? 'cancel' : state.phase === 'confirmation' ? state.confirmationReason === 'wifi' ? 'confirmTransfer' : 'confirm' : 'retry';
  const action = async () => {
    if (busy) await cancelPack(packName);
    else if (state.phase === 'confirmation') await confirmPackDownload(packName);
    else {
      await refreshPack(packName);
      if (getPackDownload(packName).phase === 'ready') invalidateImages();
      else await downloadPack(packName);
    }
  };
  return <Pressable accessibilityRole="button" disabled={state.confirmationPending} accessibilityState={{ disabled: state.confirmationPending }} onPress={() => { void action(); }} style={{ padding: 12 }}>
    <Text style={{ color: colors.headline }}>{t(`audioDownload.${key}`)}</Text>
  </Pressable>;
}
export function MissingImage({ reference, loading, onRetry }: { reference: string; loading: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useThemeSettings();
  const ref = parseImageReference(reference);
  return <View style={{ padding: 12, alignItems: 'center' }}>
    {loading ? <ActivityIndicator color={colors.headline} /> : <>
      <Text style={{ color: colors.paragraph }}>{t('contentDownload.unavailable')}</Text>
      {usesImagePAD && ref ? <RecoveryButton packName={ref.packName} /> : <Pressable accessibilityRole="button" onPress={() => { onRetry?.(); invalidateImages(); }} style={{ padding: 12 }}><Text style={{ color: colors.headline }}>{t('audioDownload.retry')}</Text></Pressable>}
    </>}
  </View>;
}
