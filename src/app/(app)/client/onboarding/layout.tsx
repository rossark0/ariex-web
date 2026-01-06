export default function ClientOnboardingLayout({ children }: { children: React.ReactNode }) {
  // This layout bypasses the normal app layout - no sidebar, no chat
  return <>{children}</>;
}
