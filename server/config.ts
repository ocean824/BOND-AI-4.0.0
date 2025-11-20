// Configuration validation - fail fast if required env vars are missing

export function validateConfig() {
  const errors: string[] = [];

  // Critical security: JWT secret must be set
  if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
    errors.push("❌ SESSION_SECRET or JWT_SECRET must be set for secure authentication");
  }

  // Database connection required
  if (!process.env.DATABASE_URL) {
    errors.push("❌ DATABASE_URL must be set for database connection");
  }

  // OpenAI integration keys (via Replit AI Integrations)
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.warn("⚠️  Warning: AI integration keys not configured. AI extraction and chat features will be unavailable.");
    console.warn("   Set AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY to enable AI features.");
  }

  // Optional: FastAPI trending service
  if (!process.env.FASTAPI_BASE_URL) {
    console.warn("⚠️  Warning: FASTAPI_BASE_URL not set. Trending refresh via FastAPI will be disabled.");
  }
  
  if (errors.length > 0) {
    console.error("\n🚨 Configuration validation failed:\n");
    errors.forEach(error => console.error(`  ${error}`));
    console.error("\nPlease set the required environment variables and restart the application.\n");
    process.exit(1);
  }

  console.log("✅ Configuration validated successfully");
}

export const config = {
  jwtSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  openai: {
    baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    enabled: !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
  },
  fastapi: {
    baseUrl: process.env.FASTAPI_BASE_URL,
    internalToken: process.env.FASTAPI_INTERNAL_TOKEN,
    enabled: !!process.env.FASTAPI_BASE_URL,
  },
};
