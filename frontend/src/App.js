import React, { useState, useEffect } from "react";
import { View, TextInput, Button, FlatList, Text } from "react-native";
import axios from "axios";

const API_URL = "https://your-api-gateway-url/referrals";

const App = () => {
  const [referrals, setReferrals] = useState([]);
  const [search, setSearch] = useState({ name: "", area: "", profession: "" });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await axios.get(API_URL, { params: search });
      setReferrals(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Name" onChangeText={(text) => setSearch({ ...search, name: text })} />
      <TextInput placeholder="Area" onChangeText={(text) => setSearch({ ...search, area: text })} />
      <TextInput placeholder="Profession" onChangeText={(text) => setSearch({ ...search, profession: text })} />
      <Button title="Search" onPress={fetchReferrals} />

      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text>{item.name} - {item.profession}</Text>}
      />
    </View>
  );
};

export default App;