import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface PreviewBoxProps {
  webContainer: WebContainer;
}
const PreviewBox = ({ webContainer }: PreviewBoxProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
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
      await installProcess.exit; // Wait for install to finish

      // const rootFiles = await webContainer?.fs.readdir("/project");
      // console.log("Root directory files:", rootFiles);
      const startProcess = await webContainer?.spawn("npm", ["run", "dev"], {
        cwd: "/project",
      });

      startProcess?.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        })
      );
      // Wait for `server-ready` event
      webContainer?.on("server-ready", (port, url) => {
        console.log(port);
        console.log(url);
        setUrl(url);
      });
    }

    main();
  }, [webContainer]);

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
