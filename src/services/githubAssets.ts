import { promises as fs } from 'node:fs';
import { basename } from 'node:path';
import { debug } from '../utils/logger';
import { credentialManager } from '../utils/credentialManager';

export interface GitHubAsset {
  url: string;
  browser_download_url: string;
  name: string;
  content_type: string;
  size: number;
}

/**
 * Upload a file to GitHub as an asset
 * Uses a repository-based approach:
 * 1. For images: Upload to a dedicated assets repository or create one if needed
 * 2. For other files: Use gists as fallback
 * 3. Return the raw.githubusercontent.com URL for direct access
 */
export async function uploadFileToGitHub(
  filePath: string,
  filename?: string
): Promise<{ url: string; markdown: string }> {
  try {
    debug('Uploading file to GitHub:', filePath);

    const actualFilename = filename || basename(filePath);
    const fileContent = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);
    
    // Determine if it's an image file
    const isImage = /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(actualFilename);
    
    // Get GitHub token
    const token = await credentialManager.getGitHubToken();
    if (!token) {
      throw new Error('GitHub token not available for file uploads');
    }

    if (isImage) {
      // Try to upload image to repository first
      try {
        const imageUrl = await uploadImageToRepository(fileContent, actualFilename, token);
        return {
          url: imageUrl,
          markdown: `![${actualFilename}](${imageUrl})`
        };
      } catch (error) {
        debug('Repository upload failed, falling back to gist:', error);
        // Fallback to gist approach
        const gistUrl = await createGistWithFile(fileContent, actualFilename, token);
        return {
          url: gistUrl,
          markdown: `![${actualFilename}](${gistUrl})`
        };
      }
    } else {
      // Use gists for non-image files
      const gistUrl = await createGistWithFile(fileContent, actualFilename, token);
      return {
        url: gistUrl,
        markdown: `[📎 ${actualFilename}](${gistUrl}) (${Math.round(fileStats.size / 1024)}KB)`
      };
    }
  } catch (error) {
    debug('Failed to upload file to GitHub:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a gist with file content and return the raw URL
 */
async function createGistWithFile(
  fileContent: Buffer,
  filename: string,
  token: string
): Promise<string> {
  const isImage = /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(filename);
  const isTextFile = /\.(txt|md|json|js|ts|html|css|log|yml|yaml|xml|csv)$/i.test(filename);
  
  let content: string;
  let actualFilename = filename;
  
  if (isImage) {
    // For images, upload as base64 encoded content directly
    // GitHub will serve the raw file properly when accessed via the raw URL
    content = fileContent.toString('base64');
    actualFilename = filename; // Keep original filename
  } else if (isTextFile) {
    content = fileContent.toString('utf8');
  } else {
    // For other binary files, encode as base64
    content = fileContent.toString('base64');
  }
  
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      description: `File attachment: ${filename}`,
      public: false,
      files: {
        [actualFilename]: {
          content: content
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create gist: ${response.status} ${errorText}`);
  }

  const gist = await response.json() as any;
  const fileUrl = gist.files[actualFilename]?.raw_url;
  
  if (!fileUrl) {
    throw new Error('Failed to get gist raw URL');
  }

  return fileUrl;
}

/**
 * Upload image to a dedicated GitHub repository for proper display
 * Creates/uses a repository specifically for storing image assets
 */
async function uploadImageToRepository(
  imageContent: Buffer,
  filename: string,
  token: string
): Promise<string> {
  const assetsRepoName = 'llpm-assets';
  const base64Content = imageContent.toString('base64');
  
  // Generate unique filename to avoid conflicts
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${filename}`;
  const filePath = `images/${uniqueFilename}`;
  
  try {
    // First, get the authenticated user info to know the owner
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status}`);
    }
    
    const user = await userResponse.json() as any;
    const username = user.login as string;
    
    // Check if assets repository exists, create if not
    await ensureAssetsRepository(username, assetsRepoName, token);
    
    // Upload the file to the repository
    const uploadResponse = await fetch(`https://api.github.com/repos/${username}/${assetsRepoName}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Add image: ${filename}`,
        content: base64Content,
        branch: 'main'
      })
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload image to repository: ${uploadResponse.status} ${errorText}`);
    }
    
    // Return the raw.githubusercontent.com URL for direct image access
    return `https://raw.githubusercontent.com/${username}/${assetsRepoName}/main/${filePath}`;
    
  } catch (error) {
    debug('Error uploading image to repository:', error);
    throw error;
  }
}

/**
 * Ensure the assets repository exists, create if it doesn't
 */
async function ensureAssetsRepository(
  username: string,
  repoName: string,
  token: string
): Promise<void> {
  try {
    // Check if repository exists
    const checkResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (checkResponse.ok) {
      // Repository exists
      debug(`Assets repository ${username}/${repoName} already exists`);
      return;
    }
    
    if (checkResponse.status === 404) {
      // Repository doesn't exist, create it
      debug(`Creating assets repository ${username}/${repoName}`);
      
      const createResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          name: repoName,
          description: 'Asset storage for LLPM file uploads',
          private: false, // Public so images can be viewed without authentication
          auto_init: true, // Initialize with README
          has_issues: false,
          has_projects: false,
          has_wiki: false
        })
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create assets repository: ${createResponse.status} ${errorText}`);
      }
      
      debug(`Successfully created assets repository ${username}/${repoName}`);
    } else {
      throw new Error(`Unexpected response checking repository: ${checkResponse.status}`);
    }
  } catch (error) {
    debug('Error ensuring assets repository:', error);
    throw error;
  }
}

/**
 * Upload multiple files and return their URLs and markdown
 */
export async function uploadFilesToGitHub(
  filePaths: string[]
): Promise<Array<{ url: string; markdown: string; filename: string }>> {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await uploadFileToGitHub(filePath);
      results.push({
        ...result,
        filename: basename(filePath)
      });
    } catch (error) {
      debug(`Failed to upload ${filePath}:`, error);
      // Continue with other files, but note the failure
      results.push({
        url: '',
        markdown: `❌ Failed to upload ${basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filename: basename(filePath)
      });
    }
  }
  
  return results;
}

/**
 * Get MIME type for common image formats
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}