import { PythonBridgeService } from './src/services/pythonBridgeService.js';

async function testSingleVideo() {
  const bridge = new PythonBridgeService();
  console.log('Testing Python Bridge with single video...');
  
  try {
    const result = await bridge.fetchTranscript('dQw4w9WgXcQ');
    console.log('SUCCESS:', result.length, 'segments');
  } catch (error) {
    console.log('FAILED:', error.message);
  }
}

testSingleVideo();