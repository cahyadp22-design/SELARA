import React, { useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Animated,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const ReportItem = React.memo(({
    item,
    index,
    onPress,
    onUpvote,
    onShare,
    isUpvoted,
    avatarColors,
    categoryColors,
}) => {
    const avatarUrl = item?.avatar_url || item?.profiles?.avatar_url || null;

    const translateY = useRef(new Animated.Value(20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const delay = Math.min(index * 50, 500);
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                delay: delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLongPress = () => {
        Alert.alert('Opsi', `Laporan: ${item.title}`, [
            { text: 'Lihat Detail', onPress: () => onPress(item.id) },
            { text: 'Bagikan', onPress: () => onShare(item) },
            { text: 'Batal', style: 'cancel' },
        ]);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: opacity,
                    transform: [{ translateY: translateY }],
                }
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPress(item.id)}
                onLongPress={handleLongPress}
            >
                <View style={styles.reportCard}>
                    <View style={styles.cardMain}>
                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            {avatarUrl && avatarUrl.startsWith('http') ? (
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={styles.avatarImage}
                                    onError={(e) => {
                                        console.log('❌ Avatar load error:', e.nativeEvent.error);
                                    }}
                                />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: avatarColors.bg }]}>
                                    <Text style={[styles.avatarText, { color: avatarColors.text }]}>
                                        {item.initials || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Konten Laporan */}
                        <View style={styles.contentContainer}>
                            {/* Title & Upvote */}
                            <View style={styles.titleRow}>
                                <Text style={styles.reportTitle} numberOfLines={2}>
                                    {item.title}
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.upvoteButton,
                                        isUpvoted && styles.upvoteButtonActive
                                    ]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onUpvote(item.id);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Feather
                                        name="arrow-up"
                                        size={14}
                                        color={isUpvoted ? '#FFFFFF' : colors.textDark}
                                    />
                                    <Text style={[
                                        styles.upvoteText,
                                        isUpvoted && styles.upvoteTextActive
                                    ]}>
                                        {item.upvotes || 0}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Location */}
                            <Text style={styles.reportLocation} numberOfLines={1}>
                                {item.location}
                            </Text>

                            {/* Badges & Time */}
                            <View style={styles.bottomRow}>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: categoryColors.bg }]}>
                                        <Text style={[styles.badgeText, { color: categoryColors.text }]}>
                                            {item.category}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.reportTime}>{item.time}</Text>
                            </View>

                            {/* Arrow Indicator */}
                            <View style={styles.arrowIndicator}>
                                <Feather name="chevron-right" size={18} color={colors.textGray} />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    reportCard: {
        backgroundColor: colors.cardBg,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarWrapper: {
        marginRight: 12,
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        flexShrink: 0,
    },
    avatarImage: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F1F5F9',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
        flex: 1,
        paddingRight: 6,
    },
    upvoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    upvoteButtonActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    upvoteText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.textDark,
        marginLeft: 3,
    },
    upvoteTextActive: {
        color: '#FFFFFF',
    },
    reportLocation: {
        fontSize: 11,
        color: colors.textGray,
        marginBottom: 6,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    badge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    reportTime: {
        fontSize: 10,
        color: colors.textGray,
        flexShrink: 0,
        marginLeft: 4,
    },
    arrowIndicator: {
        position: 'absolute',
        right: 0,
        top: '50%',
        transform: [{ translateY: -9 }],
    },
});

export default ReportItem;