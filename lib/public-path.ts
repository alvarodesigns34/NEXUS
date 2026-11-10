export function publicPath(path: `/${string}`) {
  return (process.env.NEXT_PUBLIC_NEXUS_BASE_PATH || "") + path;
}
