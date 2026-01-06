export default function ComplianceClientsPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col rounded-lg border p-4">
          <span className="font-medium">All clients</span>
          <span className="text-muted-foreground text-sm">Open client detail screens</span>
        </div>
      </div>
    </section>
  );
}
