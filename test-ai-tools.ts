#!/usr/bin/env bun

/**
 * Test AI tools directly
 */

import { listNotesTool, addNoteTool } from './src/tools/notesTools';

async function testAITools() {
  console.log('🔧 Testing AI Notes Tools...');
  
  try {
    // Test listing notes (should fail with no current project)
    console.log('\n📋 Testing listNotesTool...');
    const listResult = await listNotesTool.execute({});
    console.log('List result:', JSON.stringify(listResult, null, 2));
    
    // Test adding note (should also fail with no current project)
    console.log('\n📝 Testing addNoteTool...');
    const addResult = await addNoteTool.execute({
      title: 'AI Tool Test',
      content: 'This is a test note from AI tools',
      tags: ['ai', 'test']
    });
    console.log('Add result:', JSON.stringify(addResult, null, 2));
    
    console.log('\n✅ AI tools test completed!');
    
  } catch (error) {
    console.error('❌ AI tools test failed:', error);
    process.exit(1);
  }
}

testAITools();