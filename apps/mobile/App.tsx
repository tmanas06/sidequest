import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Linking,
  SafeAreaView,
  Share,
  Dimensions,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Data Types
interface EventItem {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt?: string;
  venueName: string;
  city: string;
  organizerName: string;
  category: 'hackathon' | 'workshop' | 'conference' | 'networking' | 'party_social' | 'technical_talk' | 'community_meetup';
  ecosystems: string[];
  registrationUrl: string;
  imageUrl?: string;
  isPopular?: boolean;
}

// Real events & images scraped directly from Luma (https://lu.ma/ibw and https://lu.ma/Devcon8)
const SEED_EVENTS: EventItem[] = [
  {
    id: 'xppe9krt',
    title: 'Trading Thursday: eXchange1 Mumbai Community Meetup volume 3',
    description: 'Weekly gathering of algorithmic and retail crypto traders discussing liquidity, on-chain derivatives, and risk management.',
    startAt: '2026-10-29T18:00:00.000+05:30',
    endAt: '2026-10-29T20:00:00.000+05:30',
    venueName: 'Mumbai, India',
    city: 'Mumbai',
    organizerName: 'eXchange1',
    category: 'community_meetup',
    ecosystems: ['Ethereum', 'DeFi'],
    registrationUrl: 'https://luma.com/xppe9krt',
    imageUrl: 'https://images.lumacdn.com/uploads/0d/7f3a5a5c-17d8-4f57-8791-e61991424555.png',
    isPopular: true,
  },
  {
    id: 'f947g8i8',
    title: 'MIP-20: Road to Devcon',
    description: 'Mumbai Ethereum developer circle deep dive preparing for global Devcon with protocol updates and architecture talks.',
    startAt: '2026-10-31T17:00:00.000+05:30',
    endAt: '2026-10-31T20:00:00.000+05:30',
    venueName: 'WeWork Enam Sambhav, BKC',
    city: 'Mumbai',
    organizerName: 'ETHMumbai',
    category: 'technical_talk',
    ecosystems: ['Ethereum', 'ZK'],
    registrationUrl: 'https://luma.com/f947g8i8',
    imageUrl: 'https://images.lumacdn.com/uploads/z6/e86bf0c0-168f-4025-bb34-94b15c9c67e7.png',
    isPopular: true,
  },
  {
    id: 'pwn87cst',
    title: 'Money in Motion : The Future of Cross-Border Payments',
    description: 'Explore stablecoin rails, RBI regulatory frameworks, and payment protocol innovations for global remittance in Mumbai.',
    startAt: '2026-11-04T18:30:00.000+05:30',
    endAt: '2026-11-04T21:30:00.000+05:30',
    venueName: 'The St. Regis Mumbai, Lower Parel',
    city: 'Mumbai',
    organizerName: 'LedgerPe Labs',
    category: 'networking',
    ecosystems: ['Polygon', 'DeFi'],
    registrationUrl: 'https://luma.com/pwn87cst',
    imageUrl: 'https://images.lumacdn.com/uploads/08/5f35d0b9-fb53-4893-93b8-ceb8601911b8.png',
    isPopular: true,
  },
  {
    id: 'f56860r1',
    title: 'Achija Pav Bhaji Meetup',
    description: 'Informal Web3 community dinner and late night Mumbai street food run with Superteam India builders and devs.',
    startAt: '2026-11-05T20:30:00.000+05:30',
    endAt: '2026-11-05T23:30:00.000+05:30',
    venueName: 'Ghatkopar East, Mumbai',
    city: 'Mumbai',
    organizerName: 'Superteam India',
    category: 'party_social',
    ecosystems: ['Solana', 'DeFi'],
    registrationUrl: 'https://luma.com/f56860r1',
    imageUrl: 'https://images.lumacdn.com/uploads/xm/10c93c76-7452-4cfe-acc5-2451a1cfe423.png',
  },
  {
    id: '01v14e7a',
    title: 'Near Builder’s Cafe #2',
    description: 'Casual coworking session and technical office hours with blockchain architects building chain abstraction and AI apps.',
    startAt: '2026-11-07T14:00:00.000+05:30',
    endAt: '2026-11-07T18:00:00.000+05:30',
    venueName: 'Subko Coffee Bandra, Mumbai',
    city: 'Mumbai',
    organizerName: 'Legion Events',
    category: 'workshop',
    ecosystems: ['AI x Web3', 'Ethereum'],
    registrationUrl: 'https://luma.com/01v14e7a',
    imageUrl: 'https://images.lumacdn.com/uploads/pj/a9514ef0-d228-4e56-89b8-1db0e509f84e.jpg',
  },
  {
    id: 'm14s3p6o',
    title: 'Indie Builders Dinner w/ Harkirat Singh',
    description: 'Private 30-person engineering dinner for fullstack Web3 engineers, founders, and open-source maintainers.',
    startAt: '2026-11-08T20:00:00.000+05:30',
    endAt: '2026-11-08T23:30:00.000+05:30',
    venueName: 'Bandra West, Mumbai',
    city: 'Mumbai',
    organizerName: 'Superteam India',
    category: 'party_social',
    ecosystems: ['Solana', 'Ethereum'],
    registrationUrl: 'https://luma.com/m14s3p6o',
    imageUrl: 'https://images.lumacdn.com/uploads/1w/4e3c45ce-f384-431e-9237-528750d83a23.png',
    isPopular: true,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'hackathon', label: 'Hackathons', icon: 'flash-outline' },
  { id: 'networking', label: 'Networking', icon: 'people-outline' },
  { id: 'technical_talk', label: 'Talks', icon: 'mic-outline' },
  { id: 'workshop', label: 'Workshops', icon: 'construct-outline' },
  { id: 'party_social', label: 'Socials', icon: 'wine-outline' },
];

const ECOSYSTEMS = ['All', 'Ethereum', 'Solana', 'Polygon', 'DeFi', 'ZK', 'AI x Web3'];
const DAY_COLORS = ['#10b981', '#38bdf8', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'schedule' | 'guide'>('feed');
  const [eventPeriod, setEventPeriod] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEcosystem, setSelectedEcosystem] = useState('All');
  const [savedEventIds, setSavedEventIds] = useState<string[]>(['ibw-hackathon-2025', 'solana-mumbai-speedrun']);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Toggle Save to My Quests / Schedule
  const toggleSave = (id: string) => {
    setSavedEventIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filtered Events - sorted chronologically date-wise
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

    return SEED_EVENTS.filter(event => {
      const eventStart = new Date(event.startAt).getTime();
      const eventEnd = new Date(event.endAt || event.startAt).getTime();

      if (eventPeriod === 'upcoming') {
        // Upcoming: starts today or in the future
        if (eventStart < todayStart) return false;
      } else {
        // Past: started before today and within the past week
        if (eventStart >= todayStart) return false;
        if (eventStart < oneWeekAgo && eventEnd < oneWeekAgo) return false;
      }

      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || event.category === selectedCategory;
      const matchesEcosystem =
        selectedEcosystem === 'All' || event.ecosystems.includes(selectedEcosystem);

      return matchesSearch && matchesCategory && matchesEcosystem;
    }).sort((a, b) => {
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      return eventPeriod === 'past' ? timeB - timeA : timeA - timeB;
    });
  }, [searchQuery, selectedCategory, selectedEcosystem, eventPeriod]);


  // Saved schedule events - sorted chronologically date-wise
  const scheduleEvents = useMemo(() => {
    return SEED_EVENTS.filter(e => savedEventIds.includes(e.id))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [savedEventIds]);

  const handleOpenLuma = (url: string) => {
    Linking.openURL(url);
  };

  const handleShareEvent = async (event: EventItem) => {
    try {
      await Share.share({
        message: `Check out ${event.title} in Mumbai during India Blockchain Week! ${event.registrationUrl}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="sparkles" size={16} color="#6c8df8" />
            <Text style={styles.brandTitle}>SideQuest</Text>
          </View>
          <View style={styles.locationPill}>
            <Ionicons name="location" size={12} color="#10b981" />
            <Text style={styles.locationText}>Mumbai Web3</Text>
          </View>
        </View>
        <Text style={styles.subHeader}>IBW & Devcon8 Side Events Navigator</Text>
      </View>

      {/* Main Content by Tab */}
      {activeTab === 'feed' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#8a99ad" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Mumbai side events, venues, organizers..."
              placeholderTextColor="#5a687d"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#8a99ad" />
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming vs Past Events Switcher */}
          <View style={styles.periodSwitcher}>
            <TouchableOpacity
              style={[styles.periodTab, eventPeriod === 'upcoming' && styles.periodTabActive]}
              onPress={() => setEventPeriod('upcoming')}
            >
              <Ionicons
                name="flash-outline"
                size={13}
                color={eventPeriod === 'upcoming' ? '#ffffff' : '#8a99ad'}
              />
              <Text
                style={[styles.periodTabText, eventPeriod === 'upcoming' && styles.periodTabTextActive]}
              >
                Upcoming
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodTab, eventPeriod === 'past' && styles.periodTabActive]}
              onPress={() => setEventPeriod('past')}
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={eventPeriod === 'past' ? '#ffffff' : '#8a99ad'}
              />
              <Text
                style={[styles.periodTabText, eventPeriod === 'past' && styles.periodTabTextActive]}
              >
                Past Events
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={isActive ? '#ffffff' : '#8a99ad'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ecosystem Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ecosystemScroll}>
            {ECOSYSTEMS.map(eco => {
              const isActive = selectedEcosystem === eco;
              return (
                <TouchableOpacity
                  key={eco}
                  style={[styles.ecoPill, isActive && styles.ecoPillActive]}
                  onPress={() => setSelectedEcosystem(eco)}
                >
                  <Text style={[styles.ecoPillText, isActive && styles.ecoPillTextActive]}>
                    {eco}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Event Cards List */}
          <View style={styles.eventList}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>
                {filteredEvents.length} Events Discovered
              </Text>
              <Text style={styles.timezoneLabel}>Timezone: IST (UTC+5:30)</Text>
            </View>

            {(() => {
              let lastDayKey = '';
              let dayIndex = -1;

              return filteredEvents.map(event => {
                const isSaved = savedEventIds.includes(event.id);
                const eventDate = new Date(event.startAt);
                const dayKey = eventDate.toDateString();
                const isNewDay = dayKey !== lastDayKey;

                if (isNewDay) {
                  lastDayKey = dayKey;
                  dayIndex++;
                }

                const dayColor = DAY_COLORS[dayIndex % DAY_COLORS.length];
                const fullDayStr = eventDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                });
                const dateStr = eventDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = eventDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={event.id}>
                    {isNewDay && (
                      <View style={[styles.dayColorBand, { borderLeftColor: dayColor }]}>
                        <View style={[styles.dayBadgePill, { backgroundColor: `${dayColor}25` }]}>
                          <Text style={[styles.dayBadgeText, { color: dayColor }]}>DAY {dayIndex + 1}</Text>
                        </View>
                        <Text style={styles.dayBandDateText}>{fullDayStr}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.eventCard, { borderLeftWidth: 3, borderLeftColor: dayColor }]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedEvent(event)}
                    >
                      {event.imageUrl ? (
                        <Image
                          source={{ uri: event.imageUrl }}
                          style={styles.cardCoverImage}
                          resizeMode="cover"
                        />
                      ) : null}

                      <View style={styles.cardContent}>
                        {/* Top card bar */}
                        <View style={styles.cardHeader}>
                          <View style={[styles.dateBadge, { backgroundColor: `${dayColor}18` }]}>
                            <Ionicons name="calendar-outline" size={12} color={dayColor} />
                            <Text style={[styles.dateBadgeText, { color: dayColor }]}>{dateStr} · {timeStr}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleSave(event.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons
                              name={isSaved ? 'bookmark' : 'bookmark-outline'}
                              size={20}
                              color={isSaved ? dayColor : '#8a99ad'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Title & Description */}
                        <Text style={styles.cardTitle}>{event.title}</Text>
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {event.description}
                        </Text>

                        {/* Venue & Organizer */}
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color="#10b981" />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {event.venueName}
                          </Text>
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="shield-checkmark-outline" size={14} color="#a78bfa" />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {event.organizerName}
                          </Text>
                        </View>

                        {/* Ecosystem Tags & Action Footer */}
                        <View style={styles.cardFooter}>
                          <View style={styles.tagsContainer}>
                            {event.ecosystems.map(t => (
                              <View key={t} style={styles.tagBadge}>
                                <Text style={styles.tagBadgeText}>{t}</Text>
                              </View>
                            ))}
                          </View>
                          <TouchableOpacity
                            style={styles.lumaButton}
                            onPress={() => handleOpenLuma(event.registrationUrl)}
                          >
                            <Text style={styles.lumaButtonText}>Luma</Text>
                            <Ionicons name="open-outline" size={13} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              });
            })()}
          </View>
        </ScrollView>
      )}

      {/* Schedule / My Quests Tab */}
      {activeTab === 'schedule' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>My SideQuest Schedule</Text>
            <Text style={styles.scheduleSubtitle}>
              {scheduleEvents.length} events marked on your Mumbai itinerary
            </Text>
            <View style={styles.lumaSchedulePill}>
              <Ionicons name="ticket-outline" size={13} color="#f472b6" />
              <Text style={styles.lumaSchedulePillText}>
                Luma Sync: Filters strictly for approved & confirmed tickets
              </Text>
            </View>
          </View>


          {scheduleEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#5a687d" />
              <Text style={styles.emptyTitle}>No events scheduled yet</Text>
              <Text style={styles.emptyDesc}>
                Browse India Blockchain Week & Devcon8 side events and tap the bookmark icon to plan your days.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => setActiveTab('feed')}
              >
                <Text style={styles.browseButtonText}>Explore Mumbai Events</Text>
              </TouchableOpacity>
            </View>
          ) : (
            scheduleEvents.map((event, idx) => (
              <View key={event.id} style={styles.scheduleCard}>
                <View style={styles.scheduleTimeCol}>
                  <Text style={styles.scheduleTime}>
                    {new Date(event.startAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.scheduleDate}>
                    {new Date(event.startAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.scheduleDetailCol}>
                  <Text style={styles.scheduleEventTitle}>{event.title}</Text>
                  <Text style={styles.scheduleVenue} numberOfLines={1}>
                    📍 {event.venueName}
                  </Text>
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity
                      style={styles.scheduleActionPill}
                      onPress={() => handleOpenLuma(event.registrationUrl)}
                    >
                      <Text style={styles.scheduleActionText}>Ticket / Luma</Text>
                      <Ionicons name="open-outline" size={11} color="#6c8df8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.scheduleActionPill, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                      onPress={() => toggleSave(event.id)}
                    >
                      <Text style={[styles.scheduleActionText, { color: '#ef4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.guideContainer}>
            <Text style={styles.scheduleTitle}>Mumbai Web3 City Hub</Text>
            <Text style={styles.scheduleSubtitle}>
              Essential attendee tips, cluster maps, and community coordination.
            </Text>

            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <Ionicons name="map-outline" size={20} color="#10b981" />
                <Text style={styles.guideCardTitle}>Event Hubs & Clusters</Text>
              </View>
              <Text style={styles.guideText}>
                • <Text style={styles.boldText}>BKC (Bandra Kurla Complex):</Text> Main IBW venue (Jio World Centre), VC summits, and daytime developer sessions.
              </Text>
              <Text style={styles.guideText}>
                • <Text style={styles.boldText}>Lower Parel:</Text> DeFi roundtables, high-end dinners, and institutional meetups at St. Regis & Palladium.
              </Text>
              <Text style={styles.guideText}>
                • <Text style={styles.boldText}>Bandra West & Juhu:</Text> Evening mixers, beachside community parties, and informal founder gatherings.
              </Text>
            </View>

            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <Ionicons name="chatbubbles-outline" size={20} color="#6c8df8" />
                <Text style={styles.guideCardTitle}>Ecosystem Coordination</Text>
              </View>
              <Text style={styles.guideText}>
                Connect directly with Mumbai Web3 attendees across telegram and builder collectives for carpools, housing shares, and last-minute RSVPs.
              </Text>
              <TouchableOpacity
                style={styles.communityBtn}
                onPress={() => Linking.openURL('https://lu.ma/ibw')}
              >
                <Text style={styles.communityBtnText}>Open Official IBW Portal</Text>
                <Ionicons name="arrow-forward" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('feed')}
        >
          <Ionicons
            name={activeTab === 'feed' ? 'compass' : 'compass-outline'}
            size={22}
            color={activeTab === 'feed' ? '#6c8df8' : '#8a99ad'}
          />
          <Text style={[styles.navText, activeTab === 'feed' && styles.navTextActive]}>
            Explore
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('schedule')}
        >
          <View>
            <Ionicons
              name={activeTab === 'schedule' ? 'calendar' : 'calendar-outline'}
              size={22}
              color={activeTab === 'schedule' ? '#6c8df8' : '#8a99ad'}
            />
            {savedEventIds.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{savedEventIds.length}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navText, activeTab === 'schedule' && styles.navTextActive]}>
            My Quests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('guide')}
        >
          <Ionicons
            name={activeTab === 'guide' ? 'navigate' : 'navigate-outline'}
            size={22}
            color={activeTab === 'guide' ? '#6c8df8' : '#8a99ad'}
          />
          <Text style={[styles.navText, activeTab === 'guide' && styles.navTextActive]}>
            City Hub
          </Text>
        </TouchableOpacity>
      </View>

      {/* Event Details Modal */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalCategoryTag}>
                  <Text style={styles.modalCategoryText}>
                    {selectedEvent.category.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                  <Ionicons name="close" size={24} color="#8a99ad" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEvent.imageUrl ? (
                  <Image
                    source={{ uri: selectedEvent.imageUrl }}
                    style={styles.modalCoverImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>

                <View style={styles.modalMetaSection}>
                  <View style={styles.modalMetaRow}>
                    <Ionicons name="time-outline" size={18} color="#6c8df8" />
                    <View style={styles.modalMetaTextCol}>
                      <Text style={styles.modalMetaLabel}>Date & Time (IST)</Text>
                      <Text style={styles.modalMetaVal}>
                        {new Date(selectedEvent.startAt).toLocaleString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalMetaRow}>
                    <Ionicons name="location-outline" size={18} color="#10b981" />
                    <View style={styles.modalMetaTextCol}>
                      <Text style={styles.modalMetaLabel}>Venue</Text>
                      <Text style={styles.modalMetaVal}>{selectedEvent.venueName}</Text>
                      <Text style={styles.modalMetaSub}>{selectedEvent.city}, India</Text>
                    </View>
                  </View>

                  <View style={styles.modalMetaRow}>
                    <Ionicons name="people-outline" size={18} color="#a78bfa" />
                    <View style={styles.modalMetaTextCol}>
                      <Text style={styles.modalMetaLabel}>Host / Organizer</Text>
                      <Text style={styles.modalMetaVal}>{selectedEvent.organizerName}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.modalSectionHeading}>About Event</Text>
                <Text style={styles.modalBodyDesc}>{selectedEvent.description}</Text>

                <Text style={styles.modalSectionHeading}>Ecosystems</Text>
                <View style={styles.modalTagsRow}>
                  {selectedEvent.ecosystems.map(eco => (
                    <View key={eco} style={styles.modalEcoPill}>
                      <Text style={styles.modalEcoText}>{eco}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Modal Action Buttons */}
              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    savedEventIds.includes(selectedEvent.id) && styles.modalSavedBtnActive,
                  ]}
                  onPress={() => toggleSave(selectedEvent.id)}
                >
                  <Ionicons
                    name={savedEventIds.includes(selectedEvent.id) ? 'checkmark-circle' : 'bookmark-outline'}
                    size={18}
                    color="#ffffff"
                  />
                  <Text style={styles.modalSaveBtnText}>
                    {savedEventIds.includes(selectedEvent.id) ? 'In My Schedule' : 'Add to Schedule'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalLumaBtn}
                  onPress={() => handleOpenLuma(selectedEvent.registrationUrl)}
                >
                  <Text style={styles.modalLumaBtnText}>Register on Luma</Text>
                  <Ionicons name="open-outline" size={16} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalShareBtn}
                  onPress={() => handleShareEvent(selectedEvent)}
                >
                  <Ionicons name="share-social-outline" size={20} color="#8a99ad" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b12',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  locationText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  subHeader: {
    color: '#8a99ad',
    fontSize: 12,
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#6c8df8',
    borderColor: '#6c8df8',
  },
  filterChipText: {
    color: '#8a99ad',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  ecosystemScroll: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  ecoPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  ecoPillActive: {
    backgroundColor: 'rgba(108, 141, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#6c8df8',
  },
  ecoPillText: {
    color: '#8a99ad',
    fontSize: 11,
    fontWeight: '500',
  },
  ecoPillTextActive: {
    color: '#6c8df8',
    fontWeight: '700',
  },
  eventList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listSectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  timezoneLabel: {
    color: '#5a687d',
    fontSize: 11,
  },
  dayColorBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayBandDateText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardCoverImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#161b22',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108, 141, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateBadgeText: {
    color: '#6c8df8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    color: '#8a99ad',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    color: '#adb8c7',
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#8a99ad',
    fontSize: 10,
    fontWeight: '500',
  },
  lumaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6c8df8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  lumaButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleHeader: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  scheduleTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    color: '#8a99ad',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#8a99ad',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#6c8df8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#0d1117',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scheduleTimeCol: {
    width: 70,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingRight: 10,
    justifyContent: 'center',
  },
  scheduleTime: {
    color: '#6c8df8',
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleDate: {
    color: '#8a99ad',
    fontSize: 11,
    marginTop: 2,
  },
  scheduleDetailCol: {
    flex: 1,
    paddingLeft: 12,
  },
  scheduleEventTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  scheduleVenue: {
    color: '#8a99ad',
    fontSize: 11,
    marginBottom: 8,
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scheduleActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(108, 141, 248, 0.3)',
  },
  scheduleActionText: {
    color: '#6c8df8',
    fontSize: 11,
    fontWeight: '600',
  },
  guideContainer: {
    padding: 16,
  },
  guideCard: {
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  guideCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  guideText: {
    color: '#8a99ad',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  communityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6c8df8',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  communityBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#080b12',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingBottom: 20,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#8a99ad',
    fontSize: 11,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#6c8df8',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#6c8df8',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCategoryTag: {
    backgroundColor: 'rgba(108, 141, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalCategoryText: {
    color: '#6c8df8',
    fontSize: 11,
    fontWeight: '800',
  },
  modalCoverImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#161b22',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 16,
  },
  modalMetaSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 18,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalMetaTextCol: {
    flex: 1,
  },
  modalMetaLabel: {
    color: '#8a99ad',
    fontSize: 11,
    fontWeight: '600',
  },
  modalMetaVal: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  modalMetaSub: {
    color: '#5a687d',
    fontSize: 11,
    marginTop: 1,
  },
  modalSectionHeading: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  modalBodyDesc: {
    color: '#8a99ad',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalEcoPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalEcoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(108, 141, 248, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6c8df8',
  },
  modalSavedBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalLumaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6c8df8',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalLumaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalShareBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    borderRadius: 12,
  },
  periodSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  periodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  periodTabActive: {
    backgroundColor: '#6c8df8',
  },
  periodTabText: {
    color: '#8a99ad',
    fontSize: 12,
    fontWeight: '600',
  },
  periodTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  lumaSchedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(235, 52, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(235, 52, 113, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lumaSchedulePillText: {
    color: '#f472b6',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});


