interface Props {
  params: { clientId: string };
}

export default function ComplianceClientOnboardingPage({ params }: Props) {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Onboarding for {params.clientId}</h1>
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="font-medium">Checklist</span>
        <span className="text-muted-foreground text-sm">Review onboarding progress</span>
      </div>
    </section>
  );
}
