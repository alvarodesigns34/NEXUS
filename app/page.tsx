import Nexus from "../components/nexus";

export default function Home() {
  return <Nexus cloudAvailable={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)} />;
}
