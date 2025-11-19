// frontend/screens/ReferralsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';

const ReferralsScreen = ({ navigation }) => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    profession: '',
    status: 'active',
  });
  const [showFilters, setShowFilters] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReferrals();
    }, [filters])
  );

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const response = await apiService.queryReferrals(filters);
      
      if (response.success) {
        setReferrals(response.items || []);
      }
    } catch (error) {
      console.error('Failed to load referrals:', error);
      Alert.alert('Error', 'Failed to load referrals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReferrals();
  };

  const handleDelete = async (referralId, businessName) => {
    Alert.alert(
      'Delete Referral',
      `Are you sure you want to delete ${businessName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteReferral(referralId);
              Alert.alert('Success', 'Referral deleted');
              loadReferrals();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete referral');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (referral) => {
    navigation.navigate('EditReferral', { referral });
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadReferrals();
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      profession: '',
      status: 'active',
    });
    setShowFilters(false);
    loadReferrals();
  };

  const filteredReferrals = referrals.filter((referral) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      referral.businessName?.toLowerCase().includes(query) ||
      referral.profession?.toLowerCase().includes(query) ||
      referral.city?.toLowerCase().includes(query) ||
      referral.contact?.toLowerCase().includes(query)
    );
  });

  const renderReferralCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.businessName}>{item.businessName}</Text>
          <Text style={styles.profession}>{item.profession}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.referralId, item.businessName)}
          >
            <Icon name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.city && (
          <View style={styles.infoRow}>
            <Icon name="location" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.city}
              {item.state && `, ${item.state}`}
            </Text>
          </View>
        )}

        {item.contact && (
          <View style={styles.infoRow}>
            <Icon name="call" size={16} color="#666" />
            <Text style={styles.infoText}>{item.contact}</Text>
          </View>
        )}

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText} numberOfLines={2}>
              {item.message}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.verified && (
            <View style={styles.badge}>
              <Icon name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search referrals..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.filterInput}
            placeholder="City"
            value={filters.city}
            onChangeText={(text) => setFilters({ ...filters, city: text })}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Profession"
            value={filters.profession}
            onChangeText={(text) => setFilters({ ...filters, profession: text })}
          />
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredReferrals}
        renderItem={renderReferralCard}
        keyExtractor={(item) => item.referralId}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="folder-open-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No referrals found</Text>
            <Text style={styles.emptySubtext}>
              Upload a WhatsApp chat to get started
            </Text>
          </View>
        }
      />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredReferrals.length} referral{filteredReferrals.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitleContainer: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profession: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  messageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  statsBar: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ReferralsScreen;