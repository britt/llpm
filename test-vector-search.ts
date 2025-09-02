#!/usr/bin/env bun

/**
 * Simple test script to verify vector search functionality
 */

import { ProjectDatabase } from './src/utils/projectDatabase';
import { readFileSync } from 'fs';

async function testVectorSearch() {
  console.log('🚀 Testing Vector Search Implementation...');
  
  try {
    // Create a test database
    const db = new ProjectDatabase('test-vector-search');
    
    console.log('📊 Database Stats:', db.getStats());
    
    // Test adding a note with embedding
    console.log('\n📝 Adding test note...');
    const note = await db.addNote(
      'Vector Search Test',
      'This is a test note about vector search functionality with semantic similarity matching.',
      ['test', 'vector', 'semantic']
    );
    console.log('✅ Note added:', note.id);
    
    // Test adding a file with embedding
    console.log('\n📄 Adding test file...');
    const testFileContent = `
      // Test TypeScript file for vector search
      export function calculateSimilarity(a: number[], b: number[]): number {
        // Calculate cosine similarity between two vectors
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
      }
    `;
    
    const file = await db.addFile(
      'test/vector-utils.ts',
      testFileContent,
      'typescript'
    );
    console.log('✅ File added:', file.path);
    
    // Test semantic search on notes
    console.log('\n🔍 Testing semantic note search...');
    const noteResults = await db.searchNotesSemantica('similarity matching', 5);
    console.log('📋 Note search results:', noteResults.length);
    noteResults.forEach((result, i) => {
      console.log(`  ${i + 1}. [${result.similarity.toFixed(3)}] ${result.title}`);
    });
    
    // Test semantic search on files
    console.log('\n🔍 Testing semantic file search...');
    const fileResults = await db.searchFilesSemantic('cosine similarity vector calculation', 5);
    console.log('📋 File search results:', fileResults.length);
    fileResults.forEach((result, i) => {
      console.log(`  ${i + 1}. [${result.similarity.toFixed(3)}] ${result.path}`);
    });
    
    // Final stats
    console.log('\n📊 Final Database Stats:', db.getStats());
    
    // Clean up
    db.close();
    console.log('\n✅ Vector search test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVectorSearch();