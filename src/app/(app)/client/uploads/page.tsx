export default function ClientUploadsPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Uploads</h1>
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="font-medium">Upload documents</span>
        <span className="text-muted-foreground text-sm">Send documents to your strategist</span>
      </div>
    </section>
  );
}
