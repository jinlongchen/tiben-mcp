#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { BackendClient } from './backend-client.js';
import dotenv from 'dotenv';

dotenv.config();

const server = new Server(
  {
    name: 'tiben-mcp',
    version: '1.0.17',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const backendClient = new BackendClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'solve_problem_from_image',
        description: '分析并解决上传图片中的K-12学校题目。支持数学、语文、英语、科学和其他学科。提供详细解释的分步解决方案。',
        inputSchema: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: '包含学校题目的图片的本地文件路径（绝对路径，可以是临时目录下的路径）或URL。支持的格式：JPG、PNG。图片应清晰显示文字、方程式、图表或其他题目内容。',
              minLength: 1,
              pattern: '^(https?://|file://|/|[a-zA-Z]:|\\.).*\\.(jpg|jpeg|png|gif|webp)$',
            },
            additional_context: {
              type: 'string',
              description: '可选的附加上下文、说明或特定要求，帮助解决题目（例如："逐步显示解题过程"、"解释概念"、"年级水平：八年级"）。',
              maxLength: 1000,
            },
          },
          required: ['image_url'],
        },
      },
      {
        name: 'find_similar_problems',
        description: '基于上传图片内容查找相似的学校题目。适用于练习、学习相似知识点或寻找题目变体。返回带有相似度评分的题目。',
        inputSchema: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: '包含参考题目的图片的本地文件路径（绝对路径，可以是临时目录下的路径）或URL。系统将分析题目类型、学科、难度级别和知识点来查找相似题目。',
              minLength: 1,
              pattern: '^(https?://|file://|/|[a-zA-Z]:|\\.).*\\.(jpg|jpeg|png|gif|webp)$',
            },
            limit: {
              type: 'number',
              description: '返回相似题目的最大数量。范围：1-20。默认值：1。较高的值提供更多选项，但可能包含相关性较低的匹配。',
              default: 1,
              minimum: 1,
              maximum: 20,
            },
          },
          required: ['image_url'],
        },
      },
      {
        name: 'get_recommended_resources',
        description: '基于上传图片中的学校题目获取个性化的教育资源和学习材料。提供针对特定主题和难度级别定制的学习指南、教程、练习材料和参考链接。',
        inputSchema: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: '包含学校题目的图片的本地文件路径（绝对路径，可以是临时目录下的路径）或URL。系统将分析学科内容、知识点和难度级别，推荐合适的学习资源和材料。',
              minLength: 1,
              pattern: '^(https?://|file://|/|[a-zA-Z]:|\\.).*\\.(jpg|jpeg|png|gif|webp)$',
            },
          },
          required: ['image_url'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error({ });
  console.error({ message: '[MCP Server] Tool called', tool_name: name, args: args });

  try {
    if (name === 'solve_problem_from_image') {
      const imageUrl = args?.image_url as string;
      const additionalContext = args?.additional_context as string | undefined;

      if (!imageUrl) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'image_url is required'
        );
      }

      console.error(`Calling backend API to solve problem from image: ${imageUrl}`);
      
      const response = await backendClient.solveImage({
        image_url: imageUrl,
        additional_context: additionalContext,
      });

      if (response.error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Backend API error: ${response.error}`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: response.solution,
          },
        ],
      };
    } else if (name === 'find_similar_problems') {
      const imageUrl = args?.image_url as string;
      const limit = args?.limit as number | undefined;

      if (!imageUrl) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'image_url is required'
        );
      }

      console.error(`Calling backend API to find similar problems from image: ${imageUrl.substring(0, 50)}...`);

      const response = await backendClient.findSimilarProblemsByImage({
        image_url: imageUrl,
        limit: limit || 1,
      });

      if (response.error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Backend API error: ${response.error}`
        );
      }

      const formattedProblems = response.problems.map((problem, index) =>
        `${index + 1}. [${(problem.similarity * 100).toFixed(1)}% match] ${problem.title}\n   ${problem.content}`
      ).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: formattedProblems || 'No similar problems found.',
          },
        ],
      };
    } else if (name === 'get_recommended_resources') {
      const imageUrl = args?.image_url as string;

      if (!imageUrl) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'image_url is required'
        );
      }

      console.error(`Calling backend API to get recommended resources for image: ${imageUrl}`);

      const response = await backendClient.getRecommendedResources({
        image_url: imageUrl,
      });

      if (response.error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Backend API error: ${response.error}`
        );
      }

      const formattedResources = response.resources.map((resource, index) =>
        `${index + 1}. **${resource.name}** (${resource.type})\n   ${resource.description}`
      ).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: formattedResources || 'No recommended resources found.',
          },
        ],
      };
    } else {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Error executing tool:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool: ${error}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Coze Solver server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});