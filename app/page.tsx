import Nexus from "../components/nexus";

export default function Home() {
  return <Nexus cloudAvailable={Boolean(process.env.NEXUS_PAGES_PREVIEW !== "true" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)} />;
}
