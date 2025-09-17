import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { Readable } from 'stream';

dotenv.config();

export interface BackendConfig {
  apiBase: string;
}

export interface SolveImageRequest {
  image_url: string;
  additional_context?: string;
}

export interface SolveImageResponse {
  solution: string;
  raw_response?: any;
  error?: string;
}

export interface SimilarProblemsRequest {
  query: string;
  limit?: number;
}

export interface SimilarProblemsByImageRequest {
  image_url: string;
  limit?: number;
}

export interface SimilarProblemsResponse {
  problems: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
  }>;
  error?: string;
}

export interface RecommendedResourcesRequest {
  image_url: string;
}

export interface RecommendedResourcesResponse {
  resources: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  error?: string;
}

export class BackendClient {
  private config: BackendConfig;

  constructor(config?: Partial<BackendConfig>) {
    this.config = {
      apiBase: 'https://tiben.zocenet.com/api',
    };
  }

  async solveImage(request: SolveImageRequest): Promise<SolveImageResponse> {
    const url = `${this.config.apiBase}/v1/solve-image`;
    console.error({ message: '[BackendClient] solveImage called with', url: url, image_url: request.image_url, has_context: !!request.additional_context });

    try {
      // Check if image_url is a local file path
      const isLocalFile = request.image_url.startsWith('/') ||
                         request.image_url.startsWith('file://') ||
                         request.image_url.startsWith('./');
      console.error({ message: '[BackendClient] isLocalFile', is_local_file: isLocalFile });

      if (isLocalFile) {
        console.error({ message: '[BackendClient] Handling local file upload' });
        // Handle local file upload
        const filePath = request.image_url.replace('file://', '');
        console.error({ message: '[BackendClient] File path', file_path: filePath });

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        // Create form data for multipart upload
        const form = new FormData();
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        console.error({ message: '[BackendClient] Creating form data with file', file_name: fileName });

        // Check file stats
        const stats = fs.statSync(filePath);
        console.error({ message: '[BackendClient] File stats', size: stats.size, exists: true });

        form.append('image', fileStream, fileName);
        if (request.additional_context) {
          form.append('additional_context', request.additional_context);
          console.error({ message: '[BackendClient] Added additional_context', context: request.additional_context });
        }

        // Upload file to API
        console.error({ message: '[BackendClient] Making request to', url });
        const headers = form.getHeaders();
        console.error({ message: '[BackendClient] Form headers', headers });

        const response = await fetch(url, {
          method: 'POST',
          body: form,
          headers: headers,
        });
        console.error({ message: '[BackendClient] Response status', status: response.status });

        if (!response.ok) {
          const errorText = await response.text();
          console.error({ message: '[BackendClient] Error response', error_text: errorText });
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;
        console.error({ message: '[BackendClient] API response', response: result });
        return {
          solution: result.data?.solution || JSON.stringify(result.data || result),
          raw_response: result,
        };
      } else {
        console.error({ message: '[BackendClient] Handling remote URL' });
        // Handle remote URL - send as JSON
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;
        console.error({ message: '[BackendClient] API response (remote)', response: result });
        return {
          solution: result.data?.solution || JSON.stringify(result.data || result),
          raw_response: result,
        };
      }
    } catch (error) {
      console.error('[BackendClient] Error calling solve-image:', error);
      throw error;
    }
  }

  async findSimilarProblems(request: SimilarProblemsRequest): Promise<SimilarProblemsResponse> {
    const url = `${this.config.apiBase}/v1/similar-problems`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
      }

      return await response.json() as SimilarProblemsResponse;
    } catch (error) {
      console.error('Error calling similar-problems:', error);
      throw error;
    }
  }

  async getRecommendedResources(request: RecommendedResourcesRequest): Promise<RecommendedResourcesResponse> {
    const url = `${this.config.apiBase}/v1/recommended-resources`;

    try {
      // Check if image_url is a local file path
      const isLocalFile = request.image_url.startsWith('/') ||
                         request.image_url.startsWith('file://') ||
                         request.image_url.startsWith('./');

      if (isLocalFile) {
        // Handle local file upload
        const filePath = request.image_url.replace('file://', '');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        // Create form data for multipart upload
        const form = new FormData();
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);

        form.append('image', fileStream, fileName);

        // Upload file to API
        const response = await fetch(url, {
          method: 'POST',
          body: form as any,
          headers: form.getHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;

        // Parse the result to match our interface
        const resources = Array.isArray(result) ? result : (result.data || []);

        return {
          resources: resources.map((resource: any) => ({
            name: resource.name || '',
            type: resource.type || '',
            description: resource.description || ''
          }))
        };
      } else {
        // Handle remote URL - send as JSON
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;

        // Parse the result to match our interface
        const resources = Array.isArray(result) ? result : (result.data || []);

        return {
          resources: resources.map((resource: any) => ({
            name: resource.name || '',
            type: resource.type || '',
            description: resource.description || ''
          }))
        };
      }
    } catch (error) {
      console.error('Error calling recommended-resources:', error);
      throw error;
    }
  }

  async findSimilarProblemsByImage(request: SimilarProblemsByImageRequest): Promise<SimilarProblemsResponse> {
    const url = `${this.config.apiBase}/v1/similar-problems-2`;

    try {
      // Check if image_url is a local file path
      const isLocalFile = request.image_url.startsWith('/') ||
                         request.image_url.startsWith('file://') ||
                         request.image_url.startsWith('./');

      if (isLocalFile) {
        // Handle local file upload
        const filePath = request.image_url.replace('file://', '');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        // Create form data for multipart upload
        const form = new FormData();
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);

        form.append('image', fileStream, fileName);
        if (request.limit) {
          form.append('limit', request.limit.toString());
        }

        // Upload file to API
        const response = await fetch(url, {
          method: 'POST',
          body: form as any,
          headers: form.getHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;

        // Parse the result to match our interface
        const problems = Array.isArray(result) ? result : (result.data || result.problems || []);

        return {
          problems: problems.map((problem: any) => ({
            id: problem.id || '',
            title: problem.title || '',
            content: problem.content || '',
            similarity: problem.similarity || 0
          }))
        };
      } else {
        // Handle remote URL or base64 - send as JSON
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: request.image_url,
            limit: request.limit || 1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as any;

        // Parse the result to match our interface
        const problems = Array.isArray(result) ? result : (result.data || result.problems || []);

        return {
          problems: problems.map((problem: any) => ({
            id: problem.id || '',
            title: problem.title || '',
            content: problem.content || '',
            similarity: problem.similarity || 0
          }))
        };
      }
    } catch (error) {
      console.error('Error calling similar-problems-by-image:', error);
      return {
        problems: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}