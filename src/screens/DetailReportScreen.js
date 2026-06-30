import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    FlatList,
    Alert,
    ActivityIndicator,
    Share,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../config/supabase';
import { useLanguage } from '../i18n/i18n';

const { width, height } = Dimensions.get('window');

export default function DetailReportScreen({
    route,
    navigation,
    onUpvote,
    onAddComment,
    onBack
}) {
    const { t } = useLanguage();
    const { reportId } = route.params || {};
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [upvotesCount, setUpvotesCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [showAllComments, setShowAllComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isLoadingComments, setIsLoadingComments] = useState(false);

    // State untuk preview gambar
    const [selectedImage, setSelectedImage] = useState(null);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageUrls, setImageUrls] = useState([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Refs
    const scrollViewRef = useRef(null);
    const commentInputRef = useRef(null);

    const getSeverityColors = (severity) => {
        const list = {
            'Parah': { bg: '#FEE2E2', text: '#EF4444', dot: '#EF4444' },
            'Sedang': { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' },
            'Ringan': { bg: '#E6F4F1', text: '#148C74', dot: '#148C74' },
        };
        return list[severity] || { bg: '#F3F4F6', text: '#4B5563', dot: '#6B7280' };
    };

    const getCategoryColors = (category) => {
        const list = {
            'Asap pabrik': { bg: '#FFEBE6', text: '#E53E3E' },
            'Pembakaran': { bg: '#FFF3E0', text: '#DD6B20' },
            'Sampah Terbakar': { bg: '#FFF3E0', text: '#DD6B20' },
            'Knalpot': { bg: '#E0F2FE', text: '#0284C7' },
            'Knalpot Kendaraan': { bg: '#E0F2FE', text: '#0284C7' },
        };
        return list[category] || { bg: '#F1F5F9', text: '#475569' };
    };

    const getAvatarColors = (initials) => {
        const list = {
            'AR': { bg: '#EEF2FF', text: '#4F46E5' },
            'DN': { bg: '#ECFDF5', text: '#059669' },
            'CH': { bg: '#F0F9FF', text: '#0284C7' },
            'YB': { bg: '#FFF7ED', text: '#EA580C' },
            'BS': { bg: '#FCE4EC', text: '#C62828' },
            'AW': { bg: '#E8F5E9', text: '#2E7D32' },
            'RF': { bg: '#F3E5F5', text: '#6A1B9A' },
            'DK': { bg: '#FFF3E0', text: '#E65100' },
            'AN': { bg: '#E3F2FD', text: '#0D47A1' },
            'US': { bg: '#F3F4F6', text: '#4B5563' },
        };
        return list[initials] || { bg: '#F3F4F6', text: '#4B5563' };
    };

    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return t('time_years_ago')(interval);
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return t('time_months_ago')(interval);
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return t('time_days_ago')(interval);
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return t('time_hours_ago')(interval);
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return t('time_minutes_ago')(interval);
        return t('detail_just_now');
    };

    // 🔑 LOAD DATA SAAT MOUNT
    useEffect(() => {
        if (reportId) {
            loadReportDetail();
            checkUpvoteStatus();
            loadComments();
        }
    }, [reportId]);

    // 🔑 CEK STATUS UPVOTE
    const checkUpvoteStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserId(user.id);

            const { data, error } = await supabase
                .from('upvotes')
                .select('*')
                .eq('user_id', user.id)
                .eq('report_id', reportId)
                .maybeSingle();

            if (error) throw error;
            setIsUpvoted(!!data);
        } catch (error) {
            console.log('Error checking upvote status:', error);
        }
    };

    const loadComments = async () => {
        setIsLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          display_name,
          avatar_url
        )
      `)
                .eq('report_id', reportId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedComments = data.map((item) => {
                    const displayName = item.profiles?.display_name || 'Pengguna';
                    const initials = displayName.substring(0, 2).toUpperCase();
                    const avatarUrl = item.profiles?.avatar_url || null;

                    return {
                        id: item.id,
                        userName: displayName,
                        initials: initials,
                        avatar_url: avatarUrl,
                        content: item.content,
                        time: formatTimeAgo(item.created_at),
                        userId: item.user_id,
                        isOwn: item.user_id === userId,
                    };
                });
                setComments(mappedComments);
            }
        } catch (error) {
            console.log('Error loading comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    // 🔑 LOAD DETAIL LAPORAN
    const loadReportDetail = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select(`
          id,
          category,
          severity,
          location_name,
          description,
          photo_urls,
          upvotes_count,
          created_at,
          user_id,
          profiles (
            display_name,
            avatar_url
          )
        `)
                .eq('id', reportId)
                .single();

            if (error) throw error;

            if (data) {
                const displayName = data.profiles?.display_name || 'Pengguna';
                const initials = displayName.substring(0, 2).toUpperCase();

                // Ambil URL gambar
                const photoUrls = data.photo_urls || [];
                setImageUrls(photoUrls);

                setReport({
                    id: data.id,
                    title: data.description || `${data.category} di ${data.location_name}`,
                    location: data.location_name || t('report_location_unknown'),
                    time: formatTimeAgo(data.created_at),
                    category: data.category,
                    severity: data.severity,
                    initials: initials,
                    description: data.description || t('detail_no_desc'),
                    image: photoUrls.length > 0 ? photoUrls[0] : null,
                    images: photoUrls,
                    upvotes: data.upvotes_count || 0,
                    reporterName: displayName,
                    reporterInitials: initials,
                    reporterAvatar: data.profiles?.avatar_url || null,
                    userId: data.user_id,
                });

                setUpvotesCount(data.upvotes_count || 0);
            }

            // Animate masuk
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();

        } catch (error) {
            console.log('Error loading report:', error);
            Alert.alert('Error', t('detail_load_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) {
            Alert.alert('Info', t('detail_comment_empty_alert'));
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Info', t('detail_comment_login_alert'));
                return;
            }

            setIsSubmittingComment(true);

            // ✅ HAPUS KOMENTAR -- dari string query
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    user_id: user.id,
                    report_id: reportId,
                    content: commentText.trim(),
                })
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles (
                    display_name,
                    avatar_url
                    )
                `)
                .single();

            if (error) {
                console.log('❌ Error adding comment:', error);
                throw error;
            }

            // Ambil data dari hasil insert
            const displayName = data.profiles?.display_name || 'Anda';
            const initials = displayName.substring(0, 2).toUpperCase();
            const avatarUrl = data.profiles?.avatar_url || null;

            const newComment = {
                id: data.id,
                userName: displayName,
                initials: initials,
                avatar_url: avatarUrl,
                content: data.content,
                time: t('detail_just_now'),
                userId: data.user_id,
                isOwn: data.user_id === userId,
            };

            setComments(prev => [newComment, ...prev]);
            setCommentText('');

            if (onAddComment) {
                onAddComment(reportId, commentText.trim());
            }

            if (scrollViewRef.current) {
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }, 100);
            }

        } catch (error) {
            console.log('❌ Error adding comment:', error);
            Alert.alert('Error', t('detail_comment_add_failed') + ': ' + (error.message || ''));
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // 🔑 HAPUS KOMENTAR
    const handleDeleteComment = (commentId, commentUserId) => {
        // Cek apakah komentar milik user sendiri atau user adalah admin
        if (commentUserId !== userId) {
            Alert.alert('Info', t('detail_comment_delete_denied'));
            return;
        }

        Alert.alert(
            t('detail_comment_delete_title'),
            t('detail_comment_delete_confirm'),
            [
                { text: t('detail_comment_cancel'), style: 'cancel' },
                {
                    text: t('detail_comment_delete_btn'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('comments')
                                .delete()
                                .eq('id', commentId);

                            if (error) throw error;

                            // Update state
                            setComments(prev => prev.filter(c => c.id !== commentId));
                            Alert.alert('OK', t('detail_comment_delete_success'));
                        } catch (error) {
                            console.log('Error deleting comment:', error);
                            Alert.alert('Error', t('detail_comment_delete_failed'));
                        }
                    }
                }
            ]
        );
    };

    // 🔑 EDIT KOMENTAR (Opsional - bisa ditambahkan nanti)
    const handleEditComment = (commentId) => {
        Alert.alert('Info', t('detail_comment_edit_soon'));
    };

    // 🔑 UPVOTE LAPORAN
    const handleUpvote = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Info', t('detail_upvote_login'));
                return;
            }

            const { data: existingUpvote, error: checkError } = await supabase
                .from('upvotes')
                .select('id')
                .eq('user_id', user.id)
                .eq('report_id', reportId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingUpvote) {
                Alert.alert('Info', 'Anda sudah memberikan upvote untuk laporan ini');
                return;
            }

            const { error: insertError } = await supabase
                .from('upvotes')
                .insert({ user_id: user.id, report_id: reportId });

            if (insertError) throw insertError;

            const newCount = upvotesCount + 1;
            await supabase
                .from('reports')
                .update({ upvotes_count: newCount })
                .eq('id', reportId);

            setIsUpvoted(true);
            setUpvotesCount(newCount);
            if (onUpvote) onUpvote(reportId);

        } catch (error) {
            console.log('Error upvoting:', error);

            if (error.code === '23505') {
                Alert.alert('Info', 'Anda sudah memberikan upvote untuk laporan ini');
                await checkUpvoteStatus();
            } else {
                Alert.alert('Error', t('detail_upvote_failed'));
            }
        }
    };

    // 🔑 SHARE LAPORAN
    const handleShare = async () => {
        try {
            await Share.share({
                message: t('detail_share_msg')(report?.title, report?.location, report?.severity),
                title: t('detail_share_title'),
            });
        } catch (error) {
            console.log(error);
        }
    };

    // 🔑 REPORT KONTEN
    const handleReport = () => {
        Alert.alert(
            t('detail_report_content_title'),
            t('detail_report_content_confirm'),
            [
                { text: t('detail_report_content_cancel'), style: 'cancel' },
                {
                    text: t('detail_report_content_btn'),
                    style: 'destructive',
                    onPress: () => Alert.alert('OK', t('detail_report_content_success'))
                },
            ]
        );
    };

    // 🔑 BACK
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation?.goBack();
        }
    };

    // 🔑 OPEN IMAGE PREVIEW
    const openImagePreview = (imageUrl, index = 0) => {
        if (!imageUrl) return;
        setSelectedImage(imageUrl);
        setCurrentImageIndex(index);
        setIsImageModalVisible(true);

        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const renderComment = ({ item }) => {
        const avatarColors = getAvatarColors(item.initials);

        // 🔑 Ambil avatar_url dari item
        const avatarUrl = item?.avatar_url || null;

        return (
            <View style={styles.commentItem}>
                {/* 🔑 AVATAR KOMENTAR - Dengan fallback */}
                <View style={styles.commentAvatarWrapper}>
                    {avatarUrl && avatarUrl.startsWith('http') ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.commentAvatarImage}
                            onError={(e) => {
                                console.log('❌ Comment avatar load error:', e.nativeEvent.error);
                            }}
                        />
                    ) : (
                        <View style={[styles.commentAvatar, { backgroundColor: avatarColors.bg }]}>
                            <Text style={[styles.commentAvatarText, { color: avatarColors.text }]}>
                                {item.initials}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentUserName}>{item.userName}</Text>
                        <Text style={styles.commentTime}>{item.time}</Text>
                        {item.isOwn && (
                            <View style={styles.commentOwnBadge}>
                                <Text style={styles.commentOwnText}>{t('detail_comment_you')}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                    <View style={styles.commentActions}>
                        <TouchableOpacity
                            style={styles.commentActionBtn}
                            onPress={() => Alert.alert('Info', t('detail_comment_like_soon'))}
                        >
                            <MaterialIcons name="favorite-border" size={14} color={colors.textGray} />
                            <Text style={styles.commentActionText}>{t('detail_comment_like')}</Text>
                        </TouchableOpacity>

                        {item.isOwn && (
                            <>
                                <TouchableOpacity
                                    style={styles.commentActionBtn}
                                    onPress={() => handleEditComment(item.id)}
                                >
                                    <MaterialIcons name="edit" size={14} color={colors.textGray} />
                                    <Text style={styles.commentActionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.commentActionBtn, styles.commentActionDanger]}
                                    onPress={() => handleDeleteComment(item.id, item.userId)}
                                >
                                    <MaterialIcons name="delete" size={14} color="#EF4444" />
                                    <Text style={[styles.commentActionText, { color: '#EF4444' }]}>{t('detail_comment_delete')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // ... LOADING, ERROR, RENDER ...

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('detail_loading')}</Text>
            </SafeAreaView>
        );
    }

    if (!report) {
        return (
            <SafeAreaView style={[styles.container, styles.errorContainer]}>
                <MaterialIcons name="error-outline" size={64} color={colors.textGray} />
                <Text style={styles.errorTitle}>{t('detail_not_found')}</Text>
                <TouchableOpacity
                    style={styles.errorButton}
                    onPress={handleBack}
                >
                    <Text style={styles.errorButtonText}>{t('detail_back_btn')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const sevColors = getSeverityColors(report.severity);
    const catColors = getCategoryColors(report.category);
    const reporterAvatar = getAvatarColors(report.reporterInitials);

    // ... RENDER UTAMA ...

    return (
        <>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('detail_title')}</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.headerIconBtn}
                            onPress={handleShare}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="share" size={20} color={colors.textDark} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerIconBtn}
                            onPress={handleReport}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="more-horiz" size={20} color={colors.textDark} />
                        </TouchableOpacity>
                    </View>
                </View>

                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View
                            style={[
                                styles.contentContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                }
                            ]}
                        >
                            {/* HERO IMAGE */}
                            {report.images && report.images.length > 0 ? (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => openImagePreview(report.images[0], 0)}
                                >
                                    <View style={styles.heroImageContainer}>
                                        <Image
                                            source={{ uri: report.images[0] }}
                                            style={styles.heroImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.imageOverlay}>
                                            <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                                                <Text style={[styles.categoryBadgeText, { color: catColors.text }]}>
                                                    {report.category}
                                                </Text>
                                            </View>
                                            {report.images.length > 1 && (
                                                <View style={styles.imageCountBadge}>
                                                    <MaterialIcons name="image" size={12} color="#FFFFFF" />
                                                    <Text style={styles.imageCountText}>
                                                        {t('detail_photos_count')(report.images.length)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.tapOverlay}>
                                            <MaterialIcons name="fullscreen" size={20} color="#FFFFFF" />
                                            <Text style={styles.tapOverlayText}>{t('detail_tap_zoom')}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.heroPlaceholder, { backgroundColor: '#F1F5F9' }]}>
                                    <View style={[styles.categoryBadgeLarge, { backgroundColor: catColors.bg }]}>
                                        <Text style={[styles.categoryBadgeTextLarge, { color: catColors.text }]}>
                                            {report.category}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* THUMBNAIL ROW */}
                            {report.images && report.images.length > 1 && (
                                <View style={styles.thumbnailRow}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {report.images.map((url, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                activeOpacity={0.8}
                                                onPress={() => openImagePreview(url, index)}
                                            >
                                                <Image
                                                    source={{ uri: url }}
                                                    style={[
                                                        styles.thumbnailImage,
                                                        index === 0 && styles.thumbnailFirst,
                                                    ]}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* INFO LAPORAN */}
                            <View style={styles.reportInfo}>
                                <Text style={styles.reportTitle}>{report.title}</Text>

                                <View style={styles.locationTimeRow}>
                                    <MaterialIcons name="location-on" size={16} color={colors.textGray} />
                                    <Text style={styles.locationTimeText}>{report.location}</Text>
                                </View>

                                <View style={styles.locationTimeRow}>
                                    <MaterialIcons name="access-time" size={16} color={colors.textGray} />
                                    <Text style={styles.locationTimeText}>{report.time}</Text>
                                </View>

                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: catColors.bg }]}>
                                        <Text style={[styles.badgeText, { color: catColors.text }]}>{report.category}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: sevColors.bg }]}>
                                        <Text style={[styles.badgeText, { color: sevColors.text }]}>{report.severity}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* REPORTER INFO */}
                            <View style={styles.reporterContainer}>
                                <View style={[styles.reporterAvatar, { backgroundColor: reporterAvatar.bg }]}>
                                    <Text style={[styles.reporterAvatarText, { color: reporterAvatar.text }]}>
                                        {report.reporterInitials}
                                    </Text>
                                </View>
                                <View style={styles.reporterInfo}>
                                    <Text style={styles.reporterName}>{report.reporterName}</Text>
                                    <Text style={styles.reporterLabel}>{t('detail_reporter')}</Text>
                                </View>
                            </View>

                            {/* DESKRIPSI */}
                            <View style={styles.descriptionContainer}>
                                <Text style={styles.descriptionTitle}>{t('detail_desc_title')}</Text>
                                <Text style={styles.descriptionText}>{report.description}</Text>
                            </View>

                            {/* ACTION BUTTONS */}
                            <View style={styles.actionContainer}>
                                <TouchableOpacity
                                    style={[styles.actionButton, isUpvoted && styles.actionButtonActive]}
                                    onPress={handleUpvote}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.actionIconWrapper, isUpvoted && styles.actionIconUpvoted]}>
                                        <MaterialIcons
                                            name="arrow-upward"
                                            size={18}
                                            color={isUpvoted ? '#FFFFFF' : colors.textDark}
                                        />
                                    </View>
                                    <Text style={[styles.actionCount, isUpvoted && styles.actionCountUpvoted]}>
                                        {upvotesCount}
                                    </Text>
                                    <Text style={[styles.actionLabel, isUpvoted && styles.actionLabelUpvoted]}>
                                        {t('detail_upvote_btn')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleShare}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.actionIconWrapper}>
                                        <MaterialIcons name="share" size={18} color={colors.textDark} />
                                    </View>
                                    <Text style={styles.actionCount}>{t('detail_share_btn')}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            {/* 🔑 KOMENTAR SECTION */}
                            <View style={styles.commentsSection}>
                                <View style={styles.commentsHeader}>
                                    <Text style={styles.commentsTitle}>
                                        {t('detail_comments_count')(comments.length)}
                                    </Text>
                                    {comments.length > 3 && (
                                        <TouchableOpacity onPress={() => setShowAllComments(!showAllComments)}>
                                            <Text style={styles.showAllText}>
                                                {showAllComments ? t('detail_comments_hide') : t('detail_comments_show_all')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isLoadingComments ? (
                                    <View style={styles.loadingComments}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <Text style={styles.loadingCommentsText}>{t('detail_comments_loading')}</Text>
                                    </View>
                                ) : comments.length === 0 ? (
                                    <View style={styles.emptyComments}>
                                        <MaterialIcons name="chat-bubble-outline" size={32} color={colors.textGray} />
                                        <Text style={styles.emptyCommentsText}>
                                            {t('detail_comments_empty')}
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={showAllComments ? comments : comments.slice(0, 3)}
                                        renderItem={renderComment}
                                        keyExtractor={(item) => item.id}
                                        scrollEnabled={false}
                                        style={styles.commentsList}
                                    />
                                )}
                            </View>

                            <View style={styles.bottomSpacer} />
                        </Animated.View>
                    </ScrollView>

                    {/* 🔑 INPUT KOMENTAR */}
                    <View style={styles.commentInputContainer}>
                        <View style={styles.commentInputWrapper}>
                            <TextInput
                                ref={commentInputRef}
                                style={styles.commentInput}
                                placeholder={t('detail_comments_placeholder')}
                                placeholderTextColor={colors.textGray}
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                maxLength={500}
                                editable={!isSubmittingComment}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!commentText.trim() || isSubmittingComment) && styles.sendButtonDisabled
                                ]}
                                onPress={handleAddComment}
                                disabled={!commentText.trim() || isSubmittingComment}
                                activeOpacity={0.7}
                            >
                                {isSubmittingComment ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <MaterialIcons
                                        name="send"
                                        size={18}
                                        color={commentText.trim() ? '#FFFFFF' : '#94A3B8'}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* MODAL PREVIEW GAMBAR */}
            <Modal
                visible={isImageModalVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setIsImageModalVisible(false);
                    setSelectedImage(null);
                }}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalBackground}
                        activeOpacity={1}
                        onPress={() => {
                            setIsImageModalVisible(false);
                            setSelectedImage(null);
                        }}
                    />
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }],
                            }
                        ]}
                    >
                        {selectedImage && (
                            <>
                                <Image
                                    source={{ uri: selectedImage }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />

                                {imageUrls.length > 1 && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.navButton, styles.navLeft]}
                                            onPress={() => {
                                                const newIndex = currentImageIndex - 1;
                                                if (newIndex >= 0) {
                                                    setCurrentImageIndex(newIndex);
                                                    setSelectedImage(imageUrls[newIndex]);
                                                }
                                            }}
                                            disabled={currentImageIndex === 0}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialIcons
                                                name="chevron-left"
                                                size={30}
                                                color={currentImageIndex === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
                                            />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.navButton, styles.navRight]}
                                            onPress={() => {
                                                const newIndex = currentImageIndex + 1;
                                                if (newIndex < imageUrls.length) {
                                                    setCurrentImageIndex(newIndex);
                                                    setSelectedImage(imageUrls[newIndex]);
                                                }
                                            }}
                                            disabled={currentImageIndex === imageUrls.length - 1}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialIcons
                                                name="chevron-right"
                                                size={30}
                                                color={currentImageIndex === imageUrls.length - 1 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
                                            />
                                        </TouchableOpacity>
                                    </>
                                )}

                                {imageUrls.length > 1 && (
                                    <View style={styles.imageIndicator}>
                                        <Text style={styles.imageIndicatorText}>
                                            {currentImageIndex + 1} / {imageUrls.length}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.closeModalBtn}
                                    onPress={() => {
                                        setIsImageModalVisible(false);
                                        setSelectedImage(null);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="close" size={28} color="#FFFFFF" />
                                </TouchableOpacity>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

// 🔑 TAMBAHKAN STYLE UNTUK PREVIEW
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textGray,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    errorButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    errorButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    headerIconBtn: {
        padding: 4,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    heroImageContainer: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 16,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    // 🔑 STYLE BARU UNTUK PREVIEW
    tapOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    tapOverlayText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    imageCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 4,
    },
    imageCountText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    thumbnailRow: {
        marginTop: 12,
        marginBottom: 4,
    },
    thumbnailImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
    },
    thumbnailFirst: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    categoryBadge: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    categoryBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    heroPlaceholder: {
        width: '100%',
        height: 140,
        borderRadius: 16,
        marginTop: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBadgeLarge: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    categoryBadgeTextLarge: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    reportInfo: {
        marginTop: 20,
        gap: 8,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 4,
    },
    locationTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationTimeText: {
        fontSize: 14,
        color: colors.textGray,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    reporterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    reporterAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    reporterAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    reporterInfo: {
        flex: 1,
    },
    reporterName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    reporterLabel: {
        fontSize: 12,
        color: colors.textGray,
    },
    descriptionContainer: {
        marginTop: 20,
    },
    descriptionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#1E293B',
    },
    actionContainer: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionButtonActive: {
        backgroundColor: '#EEF2FF',
        borderColor: colors.primary,
    },
    actionIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionIconUpvoted: {
        backgroundColor: colors.primary,
    },
    actionCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    actionCountUpvoted: {
        color: colors.primary,
    },
    actionLabel: {
        fontSize: 12,
        color: colors.textGray,
    },
    actionLabelUpvoted: {
        color: colors.primary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 20,
    },
    commentsSection: {
        marginBottom: 16,
    },
    commentsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    showAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    commentsList: {
        gap: 16,
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    commentAvatarWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        marginRight: 12,
        flexShrink: 0,
    },
    commentAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentAvatarText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    commentUserName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    commentTime: {
        fontSize: 11,
        color: colors.textGray,
    },
    commentText: {
        fontSize: 14,
        color: '#1E293B',
        lineHeight: 20,
        marginBottom: 6,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
    },
    commentLikeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentLikeText: {
        fontSize: 12,
        color: colors.textGray,
    },
    emptyComments: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyCommentsText: {
        fontSize: 14,
        color: colors.textGray,
    },
    bottomSpacer: {
        height: 20,
    },
    commentInputContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    },
    commentInputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        paddingTop: 8,
        maxHeight: 80,
        fontSize: 14,
        color: colors.textDark,
        backgroundColor: '#F8FAFC',
    },
    loadingComments: {
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    loadingCommentsText: {
        fontSize: 14,
        color: colors.textGray,
    },
    commentOwnBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 4,
    },
    commentOwnText: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: 'bold',
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    commentActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
    },
    commentActionDanger: {
        // style khusus untuk tombol hapus
    },
    commentActionText: {
        fontSize: 12,
        color: colors.textGray,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },

    // 🔑 STYLE MODAL PREVIEW
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    downloadBtn: {
        position: 'absolute',
        bottom: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -25 }],
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    navLeft: {
        left: 16,
    },
    navRight: {
        right: 16,
    },
    imageIndicator: {
        position: 'absolute',
        bottom: 50,
        left: '50%',
        transform: [{ translateX: -30 }],
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    imageIndicatorText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});