import { HomeClient } from "./home-client";

// The flow makes two text requests and one image request in sequence.
export const maxDuration = 120;

export default function Home() {
  return <HomeClient />;
}
