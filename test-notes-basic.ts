#!/usr/bin/env bun

/**
 * Simple test to verify basic notes functionality
 */

import { ProjectDatabase } from './src/utils/projectDatabase';

async function testBasicNotes() {
  console.log('🧪 Testing basic notes functionality...');
  
  try {
    const db = new ProjectDatabase('test-notes-basic');
    
    console.log('📊 Initial stats:', db.getStats());
    
    // Add a simple note
    console.log('\n📝 Adding test note...');
    const note = await db.addNote('Test Note', 'This is a test note content', ['test']);
    console.log('✅ Note added:', note);
    
    // List all notes
    console.log('\n📋 Listing all notes...');
    const notes = db.getNotes();
    console.log('Notes found:', notes.length);
    notes.forEach((note, i) => {
      console.log(`  ${i + 1}. [${note.id}] ${note.title} - ${note.content.substring(0, 50)}...`);
    });
    
    // Get specific note
    console.log('\n🔍 Getting specific note...');
    const specificNote = db.getNote(note.id);
    console.log('Retrieved note:', specificNote);
    
    // Search notes
    console.log('\n🔍 Searching notes...');
    const searchResults = db.searchNotes('test');
    console.log('Search results:', searchResults.length);
    
    // Final stats
    console.log('\n📊 Final stats:', db.getStats());
    
    db.close();
    console.log('\n✅ Basic notes test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBasicNotes();