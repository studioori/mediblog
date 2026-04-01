import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";
import { preloadFaceDetectionModels } from "@/hooks/useFaceDetection";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!convexUrl) {
  console.warn("VITE_CONVEX_URL이 설정되지 않았습니다.");
}

if (!clerkPubKey) {
  console.warn("VITE_CLERK_PUBLISHABLE_KEY가 설정되지 않았습니다.");
}

const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud");

preloadFaceDetectionModels().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </ClerkProvider>
);
