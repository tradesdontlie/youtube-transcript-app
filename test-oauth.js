import { AuthService } from './src/services/authService.js';

async function testOAuth() {
  console.log('Testing OAuth2 setup...');
  
  try {
    const authService = new AuthService();
    await authService.initialize();
    
    console.log('OAuth2 initialized successfully');
    console.log('Auth URL:', authService.getAuthUrl());
    console.log('\nTo authenticate:');
    console.log('1. Visit the URL above in your browser');
    console.log('2. Sign in and grant permissions');
    console.log('3. You\'ll be redirected back to the app');
    
  } catch (error) {
    console.log('OAuth2 setup error:', error.message);
  }
}

testOAuth().catch(console.error);