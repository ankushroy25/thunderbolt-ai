export interface Step {
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "error";
  path?: string;
}

export function parseStepsFromInput(input: string): Step[] {
  const steps: Step[] = [];

  // Match each file/section and its contents
  const stepRegex = /(.+?):\n```([^]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = stepRegex.exec(input)) !== null) {
    const title = match[1].trim(); // File or section name
    const description = match[2].trim(); // File or section content

    // Determine the path based on the title
    let path: string;
    if (title.startsWith("src/")) {
      path = `./${title}`; // Already has a clear path
    } else if (/\.(html|json|js|ts|jsx|tsx)$/.test(title)) {
      path = `./${title}`; // Assume root-level file
    } else {
      path = `./unknown/${title}`; // Fallback for unstructured input
    }

    steps.push({
      title,
      description,
      status: "completed", // Default status
      path,
    });
  }

  return steps;
}

export const parseChatResponseToSteps = (response: string): Step[] => {
  const steps: Step[] = [];

  // Match the structure containing <boltAction> tags and extract information
  const regex =
    /<boltAction type="file" filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    const filePath = match[1].trim(); // Extract file path
    const fileContent = match[2].trim(); // Extract file content

    // Push into steps array with "pending" status as default
    steps.push({
      title: `${filePath}`,
      description: fileContent,
      status: "completed", // Default status
      path: `./${filePath}`,
    });
  }

  return steps;
};
