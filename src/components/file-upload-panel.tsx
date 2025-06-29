interface FileUploadPanelProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportSTLASCII: () => void;
  onExportSTLBinary: () => void;
  onDebugGeometry: () => void;
}

const PANEL_STYLES = {
  container:
    "absolute top-2.5 right-2.5 z-10 bg-black/70 p-4 rounded-lg text-white min-w-[200px]",
  title: "m-0 mb-2.5 text-sm font-medium",
  fileInput:
    "text-white cursor-pointer text-xs w-full mb-2.5 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600",
  supportedFormats: "mb-2.5 text-xs opacity-80",
  exportSection: "mt-4 border-t border-white/30 pt-2.5",
  exportTitle: "m-0 mb-2 text-sm font-medium",
} as const;

const BUTTON_STYLES = {
  debug:
    "bg-orange-500 hover:bg-orange-600 text-white border-none px-2 py-1 m-0.5 rounded cursor-pointer text-xs w-full mb-1 transition-colors",
  exportASCII:
    "bg-green-500 hover:bg-green-600 text-white border-none px-3 py-1.5 m-0.5 rounded cursor-pointer text-xs w-full mb-1 transition-colors",
  exportBinary:
    "bg-blue-500 hover:bg-blue-600 text-white border-none px-3 py-1.5 m-0.5 rounded cursor-pointer text-xs w-full transition-colors",
} as const;

const FileUploadSection = ({
  onFileUpload,
}: {
  onFileUpload: FileUploadPanelProps["onFileUpload"];
}) => (
  <>
    <h3 className={PANEL_STYLES.title}>Upload 3D Model</h3>

    <input
      type="file"
      accept=".stl,.obj,.gltf,.glb"
      onChange={onFileUpload}
      className={PANEL_STYLES.fileInput}
    />

    <div className={PANEL_STYLES.supportedFormats}>
      Supported: STL, OBJ, GLTF, GLB
    </div>
  </>
);

const ExportSection: React.FC<{
  onExportSTLASCII: FileUploadPanelProps["onExportSTLASCII"];
  onExportSTLBinary: FileUploadPanelProps["onExportSTLBinary"];
  onDebugGeometry: FileUploadPanelProps["onDebugGeometry"];
}> = ({ onExportSTLASCII, onExportSTLBinary, onDebugGeometry }) => (
  <div className={PANEL_STYLES.exportSection}>
    <h4 className={PANEL_STYLES.exportTitle}>Export Model</h4>

    <button
      onClick={onDebugGeometry}
      className={BUTTON_STYLES.debug}
      title="Check current geometry state"
    >
      Debug: Check Geometry
    </button>

    <button
      onClick={onExportSTLASCII}
      className={BUTTON_STYLES.exportASCII}
      title="Export as STL ASCII format"
    >
      Export STL (ASCII)
    </button>

    <button
      onClick={onExportSTLBinary}
      className={BUTTON_STYLES.exportBinary}
      title="Export as STL Binary format"
    >
      Export STL (Binary)
    </button>
  </div>
);

export const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  onFileUpload,
  onExportSTLASCII,
  onExportSTLBinary,
  onDebugGeometry,
}) => {
  return (
    <div className={PANEL_STYLES.container}>
      <FileUploadSection onFileUpload={onFileUpload} />
      <ExportSection
        onExportSTLASCII={onExportSTLASCII}
        onExportSTLBinary={onExportSTLBinary}
        onDebugGeometry={onDebugGeometry}
      />
    </div>
  );
};
