import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet } from 'react-native';
import axios from 'axios';

const ReferralList = () => {
  const [referrals, setReferrals] = useState([]);
  const [filteredReferrals, setFilteredReferrals] = useState([]);
  const [filters, setFilters] = useState({
    name: '',
    area: '',
    profession: '',
  });

  useEffect(() => {
    // Fetch referrals from the API when the component mounts
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await axios.get('https://your-api-endpoint/referrals');
      setReferrals(response.data);
      setFilteredReferrals(response.data);  // Initially show all referrals
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const applyFilters = () => {
    let filtered = referrals;

    // Apply filters based on user input
    if (filters.name) {
      filtered = filtered.filter(referral =>
        referral.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    if (filters.area) {
      filtered = filtered.filter(referral =>
        referral.area.toLowerCase().includes(filters.area.toLowerCase())
      );
    }
    if (filters.profession) {
      filtered = filtered.filter(referral =>
        referral.profession.toLowerCase().includes(filters.profession.toLowerCase())
      );
    }

    setFilteredReferrals(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Referral List</Text>

      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          placeholder="Filter by name"
          value={filters.name}
          onChangeText={text => setFilters({ ...filters, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Filter by area (city, state, country)"
          value={filters.area}
          onChangeText={text => setFilters({ ...filters, area: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Filter by profession"
          value={filters.profession}
          onChangeText={text => setFilters({ ...filters, profession: text })}
        />
        <Button title="Apply Filters" onPress={applyFilters} />
      </View>

      <FlatList
        data={filteredReferrals}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.referralItem}>
            <Text>Name: {item.name}</Text>
            <Text>Area: {item.area}</Text>
            <Text>Profession: {item.profession}</Text>
            <Text>Contact Info: {item.contact}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filters: {
    marginBottom: 16,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 8,
    paddingLeft: 8,
  },
  referralItem: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
});

export default ReferralList;