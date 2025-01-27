import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface PreviewBoxProps {
  files: any[];
  webContainer: WebContainer;
}
const PreviewBox = ({ files, webContainer }: PreviewBoxProps) => {
  const [url, setUrl] = useState<string | null>(null);

  async function main() {
    const installProcess = await webContainer?.spawn("npm", ["install"], {
      cwd: "/project",
    });
    installProcess?.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      })
    );
    // const rootFiles = await webContainer?.fs.readdir("/project");
    // console.log("Root directory files:", rootFiles);
    await webContainer?.spawn("npm", ["run", "dev"], {
      cwd: "/project",
    });
    // Wait for `server-ready` event
    webContainer?.on("server-ready", (port, url) => {
      console.log(port);
      console.log(url);
      setUrl(url);
    });
  }

  useEffect(() => {
    main();
  }, []);

  return (
    <div className="h-full flex items-center justify-center">
      {!url && (
        <div className="flex flex-col items-center justify-center text-white text-xl gap-4">
          <span className="spinner"></span>
          Generating website preview
        </div>
      )}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
};

export default PreviewBox;
