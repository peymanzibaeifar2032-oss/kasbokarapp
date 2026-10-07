import { createFileRoute } from "@tanstack/react-router";
import { StudioTopBar } from "@/components/studio/top-bar";
import { ReferralClub } from "@/components/studio/referral-club";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/studio/club")({
  component: StudioClubPage,
  head: () => ({ meta: [{ title: "باشگاه مشتریان | پیمان زیبائی‌فر" }] }),
});

function StudioClubPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  if (!user) {
    return (
      <SignedOutPanel
        title="باشگاه مشتریان"
        next="/studio/club"
        loading={isPending}
        error={sessionError}
        onRetry={retry}
      />
    );
  }
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto max-w-xl px-4 py-6">
        <ReferralClub />
      </main>
    </div>
  );
}
