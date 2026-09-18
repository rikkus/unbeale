import type { NextConfig } from "next";

function gitHubPagesBasePath(): string {
  if (process.env.GITHUB_PAGES === "true") {
    const repo = process.env.GITHUB_REPOSITORY;
    if (repo) {
      const [owner, name] = repo.split("/");
      if (owner && name && name.toLowerCase() !== `${owner.toLowerCase()}.github.io`) {
        return `/${name}`;
      }
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

const basePath = gitHubPagesBasePath();

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
