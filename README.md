# 题本 MCP 解题服务

一个基于模型上下文协议（MCP）的服务器，集成题本后端 API 来解决 K-12 教育阶段的学习问题。

## 核心功能

- **图片解题**：从图片 URL 或本地文件中识别并解决学习问题
- **相似题目查找**：基于图片内容查找相似的练习题
- **资源推荐**：根据题目图片推荐相关教育资源
- **双传输协议支持**：同时支持 stdio 和 HTTP 传输协议
- **本地文件支持**：可以读取本地图片文件并上传到远程 API

## 快速开始

### NPM 安装（推荐）

首先，配置 npm 使用私有仓库的 @xiaozuzu 包：
```bash
npm config set @your-registry:registry https://npm.your-registry.com/-/packages/
```

然后在 Trae 配置文件中添加：

```json
{
  "mcpServers": {
    "错题本": {
      "command": "npx",
      "args": [
        "-y",
        "@your-registry/tiben-mcp"
      ],
      "env": {
        "KEY": ""
      }
    }
  }
}
```

## 开发环境安装

```bash
git clone <repository-url>
cd tiben-mcp
npm install
npm run build
```

## 使用方法

### 构建服务器

```bash
npm run build
```

## 可用工具

### 1. `solve_problem_from_image`（图片解题）
从图片 URL 解决 K-12 学习问题。

**参数：**
- `image_url`（必需）：包含题目的图片 URL
- `additional_context`（可选）：额外的上下文或说明

**返回值：**
- `solution`：题目的解答

### 2. `find_similar_problems`（查找相似题目）
基于上传图片内容查找相似的题目，通过分析题目类型、学科、难度级别和知识点来匹配。

**参数：**
- `image_url`（必需）：包含参考题目的图片 URL 或本地文件路径
- `limit`（可选）：返回结果的最大数量（范围：1-20，默认：1）

**返回值：**
- 带有相似度分数的相似题目列表

### 3. `get_recommended_resources`（获取推荐资源）
基于上传图片中的题目获取个性化的教育资源和学习材料。

**参数：**
- `image_url`（必需）：包含题目的图片 URL
- `resource_type`（可选）：资源类型（如：练习、教程、参考资料）

**返回值：**
- 针对特定主题和难度级别定制的学习指南、教程、练习材料和参考链接

## MCP 客户端使用示例

```javascript
// 从图片解题
await useTool('solve_problem_from_image', {
  image_url: 'https://example.com/math-problem.jpg',
  additional_context: '请展示详细的解题步骤'
});

// 查找相似题目
await useTool('find_similar_problems', {
  image_url: 'https://example.com/reference-problem.jpg',
  limit: 5
});

// 获取推荐资源
await useTool('get_recommended_resources', {
  image_url: 'https://example.com/math-problem.jpg',
  resource_type: '练习'
});
```

## 许可证

MIT

## 支持

如有问题或疑问：
1. 在仓库中提交 issue