import { Modal, Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useLeaderboardQuery } from '@/lib/supabase/queries/shared-quiz';

interface LeaderboardSheetProps {
  visible: boolean;
  sharedQuizId: string | undefined;
  currentUserId: string | undefined;
  title: string;
  onClose: () => void;
}

export function LeaderboardSheet({ visible, sharedQuizId, currentUserId, title, onClose }: LeaderboardSheetProps) {
  const { data: rows = [], isLoading } = useLeaderboardQuery(visible ? sharedQuizId : undefined, currentUserId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {isLoading ? (
            <Text style={styles.loadingText}>{t('quiz.leaderboardLoading')}</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {rows.map((row, index) => (
                <View
                  key={row.playerUserId}
                  style={[styles.row, row.isYou ? { backgroundColor: colors.badgeEarnedBg } : null]}
                >
                  <Text style={[styles.rank, row.isYou ? { color: colors.ink } : null]}>{index + 1}</Text>
                  <Text style={[styles.name, row.isYou ? styles.nameBold : null]}>
                    {row.isYou ? t('quiz.youLabel') : (row.displayName ?? t('quiz.anonymousPlayerLabel'))}
                  </Text>
                  <Text style={styles.score}>
                    {row.score}/{row.totalQuestions}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('quiz.closeCta')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' as const },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 40,
    gap: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' as const },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, textAlign: 'center' as const },
  loadingText: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, textAlign: 'center' as const },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  rank: { width: 20, fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.inkMuted },
  name: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  nameBold: { fontFamily: fonts.sansBold },
  score: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  closeButton: { padding: 14, borderRadius: 14, backgroundColor: colors.neutralWash, alignItems: 'center' as const },
  closeButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: colors.ink },
};
