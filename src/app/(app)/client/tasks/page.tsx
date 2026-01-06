export default function ClientTasksPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="font-medium">To-dos</span>
        <span className="text-muted-foreground text-sm">See tasks from your strategist</span>
      </div>
    </section>
  );
}
