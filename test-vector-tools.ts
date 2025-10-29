#!/usr/bin/env bun

/**
 * Test script for vector search AI tools
 */

import { getProjectVectorStats, semanticSearchProject } from './src/tools/vectorSearchTools';
import { addNoteTool } from './src/tools/notesTools';

async function testVectorTools() {
  console.log('🔧 Testing Vector Search AI Tools...');
  
  try {
    // Test getting stats
    console.log('\n📊 Getting project vector stats...');
    const stats = await getProjectVectorStats.execute();
    console.log('Stats result:', JSON.stringify(stats, null, 2));
    
    // Test adding a note
    console.log('\n📝 Adding a test note...');
    const noteResult = await addNoteTool.execute({
      title: 'AI Tool Test Note',
      content: 'This note was created by the AI tool for testing vector search functionality. It includes keywords about machine learning, embeddings, and semantic search.',
      tags: ['ai', 'test', 'vector']
    });
    console.log('Note creation result:', JSON.stringify(noteResult, null, 2));
    
    // Test semantic search
    console.log('\n🔍 Testing semantic search...');
    const searchResult = await semanticSearchProject.execute({
      query: 'machine learning embeddings',
      limit: 5,
      includeFiles: true,
      includeNotes: true
    });
    console.log('Search result:', JSON.stringify(searchResult, null, 2));
    
    console.log('\n✅ Vector tools test completed successfully!');
    
  } catch (error) {
    console.error('❌ Tool test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVectorTools();