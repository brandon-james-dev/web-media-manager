import { useState, type ChangeEvent, type SubmitEvent } from "react";

function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderSelectStatus, setFolderSelectStatus] = useState("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(event.target.files ?? []);
    setSelectedFiles(fileList);
    setFolderSelectStatus(`${fileList.length} files in the selected folder.`);
  };

  const handleFormSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setFolderSelectStatus("Please select files first.");
      return;
    }

    setFolderSelectStatus(`Found ${selectedFiles.length} files in the selected folder`);
  };

  return (
    <div className="home-page-container">
      <h1 className="page-title">Web Media Manager</h1>

      <form onSubmit={handleFormSubmit}>
        <label htmlFor="file-input">
          <button type="button" onClick={() => document.getElementById("file-input")?.click()}>
            Import Folder
          </button>
        </label>

        <input
          id="file-input"
          type="file"
          webkitdirectory="true"
          directory="true"
          onChange={handleFileChange}
          hidden
        />

        <div className="file-list">
          <h3>Selected Items ({selectedFiles.length}):</h3>
          <table className="file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Relative Path</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {selectedFiles.map((file) => (
                <tr key={file.webkitRelativePath || file.name}>
                  <td>{file.name}</td>
                  <td>{file.webkitRelativePath || 'Root'}</td>
                  <td>{Math.round(file.size / 1024)} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <p className="status">{folderSelectStatus}</p>
    </div>
  );
}

export default HomePage;
