interface ProgressProps {
  fileIndex: number;
  totalFiles: number;
}

export default function Progress({ fileIndex, totalFiles }: ProgressProps) {
  if (totalFiles === 0) return null;

  const current = fileIndex + 1;

  return (
    <>
      <div style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: "0.25rem" }}>
          Importing {current} of {totalFiles} files
        </div>

        <progress value={current} max={totalFiles} style={{ width: "100%" }} />
      </div>
    </>
  );
}
