import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  Folder,
  File,
  ChevronDown,
  SendIcon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";
import { API_URL } from "../config";
import { parseChatResponseToSteps, parseStepsFromInput, Step } from "../steps";
import PreviewBox from "../components/PreviewBox";
import { useWebContainer } from "../hooks/useWebContainer";

interface FileStructure {
  name: string;
  content: string;
  type: "file" | "folder";
  children?: FileStructure[];
  isOpen?: boolean;
  path?: string;
}

export default function BuilderPage() {
  const { theme } = useTheme();
  const location = useLocation();
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const prompt = location.state.prompt;
  const webcontainer = useWebContainer();

  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);

  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileStructure[]>([]);
  const [stepMessage, setStepMessage] = useState<string>("");

  const [userPrompt, setUserPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{ text: string }[]>([]);

  useEffect(() => {
    async function init() {
      setStepMessage("Initializing project files...");

      //to decide the starting template of the project
      const response = await axios.post(`${API_URL}/template`, {
        prompt: prompt.trim(),
      });
      const { prompts, uiPrompts } = response.data;
      const parsedSteps = parseStepsFromInput(uiPrompts[0]);
      setTemplateSet(true);

      // Set the parsed steps
      setSteps(parsedSteps);

      // Generate the initial file structure from steps
      const initialFiles = generateFileStructure(parsedSteps);
      setFiles(initialFiles);

      setStepMessage("Updating necessary files...");

      //get the further LLM response for the code need to written on the files
      const postBuildStepsResponse = await axios.post(`${API_URL}/chat`, {
        messages: [...prompts, prompt].map((message) => ({ text: message })),
      });

      setSteps((prevSteps) => [
        ...prevSteps,
        ...parseChatResponseToSteps(postBuildStepsResponse.data.response).map(
          (step) => ({ ...step, status: "pending" as const })
        ),
      ]);
      setStepMessage("Files completed");
      setLlmMessages(
        [...prompts, prompt].map((message) => ({ text: message }))
      );
      setLlmMessages((x) => [
        ...x,
        { text: postBuildStepsResponse.data.response },
      ]);
    }
    init();
  }, [prompt]);

  const updateFileStructure = useCallback(
    (
      currentFiles: FileStructure[],
      filePath: string[],
      fileContent: string
    ): FileStructure[] => {
      // If no path is provided, return the files as-is
      if (filePath.length === 0) return currentFiles;

      const [currentFolder, ...remainingPath] = filePath;

      // Traverse through the current files/folders
      return currentFiles
        .map((file) => {
          if (file.name === currentFolder) {
            if (remainingPath.length === 0 && file.type === "file") {
              // If we are at the target file, update its content
              return { ...file, content: fileContent };
            } else if (file.type === "folder") {
              // Recursively update the folder's children
              const updatedChildren = updateFileStructure(
                file.children || [],
                remainingPath,
                fileContent
              );
              return { ...file, children: updatedChildren };
            }
          }
          return file; // Return unchanged files/folders
        })
        .concat(
          // If the folder doesn't exist, create it along with the file inside it
          remainingPath.length > 0 &&
            !currentFiles.find(
              (f) => f.name === currentFolder && f.type === "folder"
            )
            ? [
                {
                  name: currentFolder,
                  type: "folder",
                  content: "",
                  isOpen: true,
                  children: updateFileStructure([], remainingPath, fileContent), // Create folder and file inside it
                },
              ]
            : remainingPath.length === 0 &&
              !currentFiles.find(
                (f) => f.name === currentFolder && f.type === "file"
              )
            ? [
                {
                  name: currentFolder,
                  type: "file",
                  content: fileContent,
                },
              ]
            : []
        );
    },
    []
  );

  useEffect(() => {
    setFiles((prevFiles) => {
      let updatedFiles = JSON.parse(JSON.stringify(prevFiles)); // Deep copy to ensure immutability

      // Loop through each step and update the file structure
      steps.forEach((step) => {
        const filePath = step.path?.split("/") || []; // Split path into folder segments
        updatedFiles = updateFileStructure(
          updatedFiles,
          filePath,
          step.description
        );
      });

      return updatedFiles; // Return the updated file structure
    });
  }, [steps, updateFileStructure]);

  //Effect to mount the files on the webcontainer as per the required schema of Stackblitz webcontainer
  useEffect(() => {
    const mountStructure = (files: FileStructure[]): Record<string, any> => {
      const structure: Record<string, any> = {};

      files.forEach((file) => {
        // Replace "." with "root" for folder names
        const name = file.name === "." ? "project" : file.name;

        if (file.type === "folder") {
          // Add a directory key for folders
          structure[name] = {
            directory: mountStructure(file.children || []),
          };
        } else if (file.type === "file") {
          // Add a file key for files
          structure[name] = {
            file: {
              contents: file.content || "", // Set the file's content
            },
          };
        }
      });

      return structure;
    };

    const transformedFiles = mountStructure(files);

    webcontainer
      ?.mount(transformedFiles)
      .catch((err) => {
        console.log("Erroe mounting files ", err);
      })
      .then(() => {
        console.log("Files mounted successfully");
      });
  }, [files, webcontainer]);

  // Helper function to generate the initial file structure
  const generateFileStructure = (steps: Step[]): FileStructure[] => {
    const rootFolder: FileStructure[] = [];

    steps.forEach((step) => {
      const pathSegments = step.path?.split("/") || [];
      const fileName = pathSegments.pop() || ""; // Get file name
      let currentFolder = rootFolder;

      // Traverse the folder hierarchy
      pathSegments.forEach((segment) => {
        let folder = currentFolder.find(
          (child) => child.name === segment && child.type === "folder"
        );
        if (!folder) {
          folder = {
            name: segment,
            type: "folder",
            content: "",
            isOpen: true,
            children: [],
          };
          currentFolder.push(folder);
        }
        currentFolder = folder.children!;
      });

      // Add the file to the folder
      currentFolder.push({
        name: fileName,
        type: "file",
        content: step.description || "",
      });
    });

    return rootFolder;
  };

  const getStatusColor = (status: Step["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-300 dark:bg-gray-600";
    }
  };

  const toggleFolder = (path: string[]) => {
    setFiles((prevFiles) => {
      const newFiles = JSON.parse(JSON.stringify(prevFiles));
      let current = newFiles;
      let target = null;

      // Find the target folder
      for (const segment of path) {
        target = current.find((f: FileStructure) => f.name === segment);
        if (target && target.children) {
          current = target.children;
        }
      }

      // Toggle only the target folder's isOpen state
      if (target) {
        target.isOpen = !target.isOpen;
      }

      return newFiles;
    });
  };

  const FileExplorer = ({
    items,
    path = [],
  }: {
    items: FileStructure[];
    path?: string[];
  }) => (
    <div className="pl-4 ">
      {items.map((item) => (
        <div key={item.name}>
          <div
            className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              if (item.type === "folder") {
                toggleFolder([...path, item.name]);
              } else {
                setSelectedFile(item.name);
              }
            }}
          >
            {item.type === "folder" && (
              <ChevronDown
                size={16}
                className={`transform transition-transform ${
                  item.isOpen ? "" : "-rotate-90"
                }`}
              />
            )}
            {item.type === "folder" ? <Folder size={16} /> : <File size={16} />}
            <span>{item.name}</span>
          </div>
          {item.type === "folder" && item.isOpen && item.children && (
            <FileExplorer items={item.children} path={[...path, item.name]} />
          )}
        </div>
      ))}
    </div>
  );

  const getFileContentByPath = (
    files: FileStructure[],
    selectedFile: string
  ): string | undefined => {
    for (const file of files) {
      if (file.type === "file" && file.name === selectedFile) {
        return file.content;
      }
      // If it's a folder, recursively search inside the children
      if (file.type === "folder" && file.children) {
        const content = getFileContentByPath(file.children, selectedFile);
        if (content) {
          return content;
        }
      }
    }
    return undefined;
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "code"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              <Code className="inline-block mr-2" size={16} />
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "preview"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              <Eye className="inline-block mr-2" size={16} />
              Preview
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Steps Panel */}
          <div className="w-72 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900">
            <div className="py-4 px-2 max-h-[60vh] border-b overflow-y-scroll overflow-hidden scrollbar-thin ">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Build Steps
              </h2>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-1"
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 mt-1 rounded-full ${getStatusColor(
                          step.status
                        )}`}
                      />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {step.title}
                      </h3>
                    </div>
                    {/* <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p> */}
                  </div>
                ))}
              </div>
            </div>
            {stepMessage != "Files completed" && (
              <p className="p-4 text-gray-600 dark:text-gray-300 font-semibold">
                {stepMessage}{" "}
                <span className="inline-block w-4 h-4 border-2 border-t-2 border-t-white border-green-500 rounded-full animate-spin ml-2"></span>
              </p>
            )}
            <div>
              <div className="flex justify-center">
                <br />
                {loading && (
                  <p className="text-white flex items-center font-semibold pt-2">
                    Updating files
                    <span className="inline-block w-4 h-4 border-2 border-t-2 border-t-white border-green-500 rounded-full animate-spin ml-2"></span>
                  </p>
                )}
                {!(loading || !templateSet) && (
                  <div className="flex items-center mt-8">
                    <textarea
                      value={userPrompt}
                      onChange={(e) => {
                        setUserPrompt(e.target.value);
                      }}
                      className="p-2 w-full rounded-xl"
                    ></textarea>
                    <button
                      onClick={async () => {
                        const newMessage = {
                          text: userPrompt,
                        };

                        setLoading(true);
                        const stepsResponse = await axios.post(
                          `${API_URL}/chat`,
                          {
                            messages: [...llmMessages, newMessage],
                          }
                        );
                        setLoading(false);

                        setLlmMessages((x) => [...x, newMessage]);
                        setLlmMessages((x) => [
                          ...x,
                          {
                            text: stepsResponse.data.response,
                          },
                        ]);

                        setSteps((s) => [
                          ...s,
                          ...parseChatResponseToSteps(
                            stepsResponse.data.response
                          ).map((x) => ({
                            ...x,
                            status: "pending" as const,
                          })),
                        ]);
                      }}
                      className="bg-purple-400 h-full w-16 p-2 ml-2 flex justify-center items-center rounded-xl"
                    >
                      <SendIcon className="" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File Explorer */}
          <div
            className={`border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-[80vh] overflow-y-auto scrollbar-none ${
              isExplorerOpen ? "w-64" : "w-12"
            } transition-all duration-200`}
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
              <span
                className={`${
                  isExplorerOpen ? "block" : "hidden"
                } text-gray-900 dark:text-white font-semibold`}
              >
                Files
              </span>
              <button
                onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"
              >
                {isExplorerOpen ? (
                  <ChevronLeft size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            </div>
            {isExplorerOpen && <FileExplorer items={files} />}
          </div>

          {/* Editor/Preview */}
          <div className="flex-1 bg-white dark:bg-gray-900">
            {activeTab === "code" && selectedFile ? (
              <Editor
                height="80vh"
                defaultLanguage="typescript"
                theme={theme === "dark" ? "vs-dark" : "light"}
                value={getFileContentByPath(files, selectedFile) || ""}
              />
            ) : activeTab === "preview" ? (
              <PreviewBox webContainer={webcontainer} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a file to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
