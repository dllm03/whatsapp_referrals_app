// frontend/screens/UploadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiService from '../services/api';

const UploadScreen = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (result.size > maxSize) {
          Alert.alert('Error', 'File size must be less than 10MB');
          return;
        }

        // Validate file extension
        const validExtensions = ['.txt', '.csv'];
        const fileExt = result.name.substring(result.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExt)) {
          Alert.alert('Error', 'Only .txt and .csv files are allowed');
          return;
        }

        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await apiService.uploadFile(
        selectedFile.uri,
        selectedFile.name,
        selectedFile.mimeType || 'text/plain'
      );

      if (response.success) {
        Alert.alert(
          'Success',
          'File uploaded successfully! Processing referrals...',
          [
            {
              text: 'View Referrals',
              onPress: () => navigation.navigate('Referrals'),
            },
            { text: 'Upload Another', onPress: () => setSelectedFile(null) },
          ]
        );

        // Process the file and create referrals
        await processUploadedFile(response.fileKey);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const processUploadedFile = async (fileKey) => {
    try {
      // Get file content
      const downloadUrl = await apiService.getFileDownloadUrl(fileKey);
      
      // Fetch and parse file
      const response = await fetch(downloadUrl.url);
      const content = await response.text();
      
      // Parse WhatsApp chat or CSV
      const referrals = parseFileContent(content);
      
      // Create referrals
      for (const referral of referrals) {
        try {
          await apiService.createReferral({
            ...referral,
            sourceFile: fileKey,
          });
        } catch (error) {
          console.error('Failed to create referral:', error);
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
    }
  };

  const parseFileContent = (content) => {
    const referrals = [];
    const lines = content.split('\n');
    
    // Simple parsing logic - customize based on your file format
    lines.forEach((line) => {
      // Skip empty lines
      if (!line.trim()) return;
      
      // Parse based on your format
      // This is a basic example - adjust to your needs
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length >= 3) {
        referrals.push({
          businessName: parts[0],
          profession: parts[1],
          city: parts[2],
          contact: parts[3] || '',
          message: parts[4] || '',
        });
      }
    });
    
    return referrals;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Upload WhatsApp Chat</Text>
          <Text style={styles.infoText}>
            Upload your exported WhatsApp group chat (.txt) or a CSV file with referral information.
          </Text>
          <Text style={styles.infoSubtext}>
            • Maximum file size: 10MB{'\n'}
            • Supported formats: .txt, .csv{'\n'}
            • File will be securely encrypted
          </Text>
        </View>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={pickDocument}
          disabled={uploading}
        >
          <Text style={styles.selectButtonText}>
            {selectedFile ? 'Change File' : 'Select File'}
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{selectedFile.name}</Text>
            <Text style={styles.fileSize}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
        )}

        {uploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.progressText}>Uploading file...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!selectedFile || uploading) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!selectedFile || uploading}
        >
          <Text style={styles.uploadButtonText}>Upload & Process</Text>
        </TouchableOpacity>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipsText}>
            • Export your WhatsApp group chat without media{'\n'}
            • Ensure the chat contains business information{'\n'}
            • For CSV files, use format: Business, Profession, City, Contact
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default UploadScreen;