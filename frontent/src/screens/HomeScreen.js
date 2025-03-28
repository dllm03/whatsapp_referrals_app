import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { getReferrals } from '../services/referralService';  // Make sure to set up this service for fetching referrals.

const HomeScreen = ({ navigation }) => {
  const [referrals, setReferrals] = useState([]);
  const [filteredReferrals, setFilteredReferrals] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterProfession, setFilterProfession] = useState('');

  useEffect(() => {
    // Fetch all referrals on component mount
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const allReferrals = await getReferrals();  // Service to fetch referrals (you'll need to implement this).
      setReferrals(allReferrals);
      setFilteredReferrals(allReferrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const applyFilters = () => {
    let filtered = referrals;

    if (filterName) {
      filtered = filtered.filter(referral => referral.name.toLowerCase().includes(filterName.toLowerCase()));
    }
    if (filterArea) {
      filtered = filtered.filter(referral => referral.area.toLowerCase().includes(filterArea.toLowerCase()));
    }
    if (filterProfession) {
      filtered = filtered.filter(referral => referral.profession.toLowerCase().includes(filterProfession.toLowerCase()));
    }

    setFilteredReferrals(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Referral List</Text>

      <TextInput
        style={styles.input}
        placeholder="Filter by Name"
        value={filterName}
        onChangeText={setFilterName}
      />
      <TextInput
        style={styles.input}
        placeholder="Filter by Area (City, State, Country)"
        value={filterArea}
        onChangeText={setFilterArea}
      />
      <TextInput
        style={styles.input}
        placeholder="Filter by Profession"
        value={filterProfession}
        onChangeText={setFilterProfession}
      />

      <Button title="Apply Filters" onPress={applyFilters} />

      <FlatList
        data={filteredReferrals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.referralItem}>
            <Text style={styles.referralName}>{item.name}</Text>
            <Text>{item.profession}</Text>
            <Text>{item.area}</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddReferral')}>
        <Text style={styles.addButtonText}>Add New Referral</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
  referralItem: {
    padding: 10,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  referralName: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  addButton: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default HomeScreen;