import { getMetadataStore } from "@/lib";

function SettingsPage() {
  async function handleClearDb(e: React.FormEvent) {
    e.preventDefault();

    const store = getMetadataStore();
    await store.clearStore();

    alert("Database cleared.");
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1 className="page-title">Settings</h1>

      <form onSubmit={handleClearDb} style={{ marginTop: "2rem" }}>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Clear Song Database
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
