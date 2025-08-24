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
  const [processingCount, setProcessingCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  const exportToCSV = async () => {
    if (isExporting || processingCount > 0) return; // Guard against multiple exports

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
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    if (!photo?.uri) return;
    setProcessingCount((prev) => prev + 1);
    try {
      const extractedText = await Vocab2CSVProcessor.processPhoto(photo.uri);
      const newPairs = await processVocabularyText(extractedText);
      setVocabPairs((prev) => [...prev, ...newPairs]);
    } catch (error) {
      console.error('Error processing photo:', error);
    } finally {
      setProcessingCount((prev) => prev - 1);
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
        disabled={isExporting || processingCount > 0}>
        <Text style={styles.exportIcon}>📋</Text>
        <Text style={styles.exportCount}>{vocabPairs.length}</Text>
      </TouchableOpacity>
      {processingCount > 0 && (
        <View style={styles.processingIndicator}>
          <Text style={styles.processingIcon}>⏳</Text>
          <Text style={styles.processingCount}>{processingCount}</Text>
        </View>
      )}
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
    height: 44,
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
  processingIndicator: {
    position: 'absolute',
    top: 60,
    left: 100,
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
    height: 44,
  },
  processingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  processingCount: {
    color: 'white',
    fontSize: 14,
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
