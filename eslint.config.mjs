import nextConfig from "eslint-config-next";
import nextTypeScriptConfig from "eslint-config-next/typescript";
import nextCoreWebVitalsConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  ...nextTypeScriptConfig,
  ...nextCoreWebVitalsConfig,
];

export default config;
