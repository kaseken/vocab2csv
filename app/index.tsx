import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Vocab2CSVProcessor from '../modules/vocab2csv-processor';
import { processVocabularyText, VocabPair } from '../services/openaiService';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [vocabPairs, setVocabPairs] = useState<VocabPair[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const exportToCSV = async () => {
    if (isExporting) return; // Guard against multiple exports

    if (vocabPairs.length === 0) {
      Alert.alert('No Data', 'No vocabulary pairs to export.');
      return;
    }

    setIsExporting(true);

    const csvContent = vocabPairs.map((pair) => `"${pair.en}","${pair.ja}"`).join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vocab-${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', `File saved as ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting CSV file:', error);
      Alert.alert('Error', 'Failed to export CSV file.');
    } finally {
      setIsExporting(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      console.log('Photo URI:', photo?.uri);

      if (photo?.uri) {
        try {
          const extractedText = await Vocab2CSVProcessor.processPhoto(photo.uri);
          console.log('Vision API extracted text:', extractedText);

          // Process the extracted text with OpenAI
          const newPairs = await processVocabularyText(extractedText);
          console.log('Processed vocabulary pairs:', newPairs);

          // Add new pairs to memory
          setVocabPairs((prev) => [...prev, ...newPairs]);
        } catch (error) {
          console.error('Error processing photo:', error);
        }
      }
    }
  };

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <TouchableOpacity
        style={styles.exportButton}
        onPress={exportToCSV}
        disabled={isExporting}>
        <Text style={styles.exportIcon}>📋</Text>
        <Text style={styles.exportCount}>{vocabPairs.length}</Text>
      </TouchableOpacity>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <Text style={styles.captureText}>📷</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  exportButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  exportIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  exportCount: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    left: 64,
    right: 64,
    flexDirection: 'row',
  },
  captureButton: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    padding: 15,
  },
  captureText: {
    fontSize: 24,
  },
});
