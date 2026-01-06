export default function ClientAgreementsPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Agreements</h1>
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="font-medium">Sign agreements</span>
        <span className="text-muted-foreground text-sm">Complete required signatures</span>
      </div>
    </section>
  );
}
