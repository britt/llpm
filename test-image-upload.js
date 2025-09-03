#!/usr/bin/env bun

// Simple integration test for the new image upload functionality
import { promises as fs } from 'node:fs';
import { uploadFileToGitHub } from './src/services/githubAssets.ts';
import { credentialManager } from './src/utils/credentialManager.ts';

async function testImageUpload() {
  console.log('Testing image upload functionality...\n');
  
  // Check if GitHub token is available
  const token = await credentialManager.getGitHubToken();
  if (!token) {
    console.log('❌ No GitHub token found. Please set GITHUB_TOKEN environment variable.');
    console.log('   You can get a token from: https://github.com/settings/tokens');
    process.exit(1);
  }
  
  console.log('✅ GitHub token found');
  
  // Create a small test image (1x1 PNG)
  const testImagePath = '/tmp/test-image.png';
  // This is a base64-encoded 1x1 transparent PNG
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  try {
    // Write test image to temp file
    await fs.writeFile(testImagePath, pngData);
    console.log('✅ Created test image');
    
    // Test upload
    console.log('🔄 Uploading image to GitHub...');
    const result = await uploadFileToGitHub(testImagePath, 'test-upload.png');
    
    console.log('✅ Upload successful!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Markdown: ${result.markdown}`);
    
    // Test that the URL is accessible
    console.log('🔄 Testing URL accessibility...');
    const response = await fetch(result.url);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log(`✅ URL is accessible (Content-Type: ${contentType})`);
      
      if (contentType?.startsWith('image/')) {
        console.log('✅ Content-Type indicates this is an image - should display properly in GitHub!');
      } else {
        console.log('⚠️  Content-Type is not an image type - may not display properly');
      }
    } else {
      console.log(`❌ URL returned status ${response.status}`);
    }
    
    // Cleanup
    await fs.unlink(testImagePath);
    console.log('✅ Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Cleanup on error
    try {
      await fs.unlink(testImagePath);
    } catch {}
    
    process.exit(1);
  }
}

if (import.meta.main) {
  testImageUpload();
}