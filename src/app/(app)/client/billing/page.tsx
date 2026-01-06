export default function ClientPaymentsPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="font-medium">Invoices</span>
        <span className="text-muted-foreground text-sm">
          Pay invoice links from your strategist
        </span>
      </div>
    </section>
  );
}
