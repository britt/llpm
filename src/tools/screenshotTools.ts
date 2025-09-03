import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { debug } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Take a screenshot of a web page using shot-scraper
 */
export const takeScreenshotTool = tool({
  description: 'Take a screenshot of a web page using the shot-scraper CLI tool. Returns the path to the saved screenshot file.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the web page to screenshot'),
    width: z.number().optional().describe('Browser width in pixels (default: 1280)'),
    height: z.number().optional().describe('Browser height in pixels (default: 720)'),
    selector: z.string().optional().describe('CSS selector to screenshot specific element instead of full page'),
    wait: z.number().optional().describe('Milliseconds to wait before taking screenshot'),
    filename: z.string().optional().describe('Custom filename for the screenshot (without extension)')
  }),
  execute: async ({ url, width, height, selector, wait, filename }) => {
    try {
      debug('Taking screenshot of:', url);

      // Check if uv and shot-scraper are available
      try {
        await execAsync('uv --version');
      } catch (error) {
        const instructions = [
          '📸 Screenshot Setup Required',
          '',
          'To take screenshots, you need to install uv and shot-scraper:',
          '',
          '1. Install uv (Python package manager):',
          '   curl -LsSf https://astral.sh/uv/install.sh | sh',
          '',
          '2. Install shot-scraper:',
          '   uv pip install shot-scraper',
          '',
          '3. Verify installation:',
          '   uvx shot-scraper --version',
          '',
          'After installation, try your screenshot request again!'
        ].join('\n');

        return {
          success: false,
          userMessage: instructions,
          error: 'uv is not installed - installation instructions provided to user'
        };
      }

      try {
        await execAsync('uvx shot-scraper --version');
      } catch (error) {
        const instructions = [
          '📸 Shot-scraper Setup Required',
          '',
          'uv is installed, but shot-scraper is not available.',
          '',
          'To install shot-scraper:',
          '   uv pip install shot-scraper',
          '',
          'Then verify with:',
          '   uvx shot-scraper --version',
          '',
          'After installation, try your screenshot request again!'
        ].join('\n');

        return {
          success: false,
          userMessage: instructions,
          error: 'shot-scraper is not available - installation instructions provided to user'
        };
      }

      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotFilename = filename 
        ? `${filename}.png` 
        : `screenshot-${timestamp}.png`;
      
      const outputPath = join(tmpdir(), screenshotFilename);

      // Build uvx shot-scraper command
      const args = [
        'uvx', 'shot-scraper',
        `"${url}"`,
        '--output', `"${outputPath}"`
      ];

      if (width && height) {
        args.push('--width', width.toString(), '--height', height.toString());
      }

      if (selector) {
        args.push('--selector', `"${selector}"`);
      }

      if (wait) {
        args.push('--wait', wait.toString());
      }

      const command = args.join(' ');
      debug('Executing uvx shot-scraper command:', command);

      // Execute screenshot command
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000 // 60 second timeout for slow network/rendering
      });

      debug('shot-scraper stdout:', stdout);
      if (stderr) {
        debug('shot-scraper stderr:', stderr);
        // Only treat stderr as error if it contains actual error indicators
        if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('failed')) {
          return {
            success: false,
            error: `shot-scraper error: ${stderr}`,
            userMessage: `Screenshot failed: ${stderr}`
          };
        }
      }

      // Check if file was created
      try {
        await fs.access(outputPath);
        const stats = await fs.stat(outputPath);
        
        if (stats.size === 0) {
          return {
            success: false,
            error: `Screenshot file created but is empty`,
            userMessage: `Screenshot of ${url} failed - file was created but is empty. The page might have failed to load or render properly.`
          };
        }
        
        debug('Screenshot saved:', outputPath, 'Size:', stats.size, 'bytes');
        
        return {
          success: true,
          path: outputPath,
          filename: screenshotFilename,
          size: stats.size,
          url: url,
          message: `Screenshot of ${url} saved successfully`,
          userMessage: `📸 Screenshot saved to: ${outputPath}\nFile size: ${Math.round(stats.size / 1024)}KB`
        };
      } catch (fileError) {
        debug('File access error:', fileError);
        return {
          success: false,
          error: `Screenshot file not created at ${outputPath}: ${fileError}`,
          userMessage: `Screenshot of ${url} failed - file was not created. This might be due to network issues, invalid URL, or rendering problems.`
        };
      }

    } catch (error) {
      debug('Screenshot error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to take screenshot: ${errorMessage}`,
        userMessage: `Screenshot of ${url} failed: ${errorMessage}`
      };
    }
  }
});

/**
 * Check if shot-scraper is installed and ready to use
 */
export const checkScreenshotSetupTool = tool({
  description: 'Check if shot-scraper is properly installed and configured for taking screenshots',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      debug('Checking uv and shot-scraper installation');

      // Check if uv is installed
      try {
        await execAsync('uv --version');
      } catch (uvError) {
        const instructions = [
          '📸 Screenshot Setup Required',
          '',
          'To use screenshots, you need to install uv and shot-scraper:',
          '',
          '1. Install uv (Python package manager):',
          '   curl -LsSf https://astral.sh/uv/install.sh | sh',
          '',
          '2. Install shot-scraper:',
          '   uv pip install shot-scraper',
          '',
          '3. Test with:',
          '   uvx shot-scraper --version',
          '',
          'Once installed, screenshots will work automatically!'
        ].join('\n');

        return {
          success: false,
          userMessage: instructions,
          error: 'uv is not installed',
          installCommand: 'curl -LsSf https://astral.sh/uv/install.sh | sh'
        };
      }

      // Check if shot-scraper is available via uvx
      const { stdout } = await execAsync('uvx shot-scraper --version');
      
      return {
        success: true,
        version: stdout.trim(),
        message: 'shot-scraper is available via uvx and ready to use',
        installCommand: 'uv pip install shot-scraper'
      };

    } catch (error) {
      debug('shot-scraper check failed:', error);
      
      const instructions = [
        '📸 Shot-scraper Not Available',
        '',
        'uv is installed, but shot-scraper needs to be installed:',
        '',
        '1. Install shot-scraper:',
        '   uv pip install shot-scraper',
        '',
        '2. Test the installation:',
        '   uvx shot-scraper --version',
        '',
        'After installation, screenshots will work!'
      ].join('\n');
      
      return {
        success: false,
        userMessage: instructions,
        error: 'shot-scraper is not available via uvx',
        installCommand: 'uv pip install shot-scraper'
      };
    }
  }
});