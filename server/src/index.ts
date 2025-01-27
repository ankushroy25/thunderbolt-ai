require("dotenv").config();
import express, { response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemPrompt } from "./prompt";
import { reactTemplate } from "./templates/react";
import { BASE_PROPMT } from "./prompt";
import { nodeTemplate } from "./templates/node";
import cors from "cors";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("No API key provided.");
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: getSystemPrompt(),
});

const templateModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction:
    "Analyze the question and decide whether the app to be built is rect or node app. Decide and respond with only one word, either 'React' or 'Node' and nothing else.",
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;

  const result = await templateModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 80,
      temperature: 0.1,
      responseMimeType: "text/plain",
    },
  });

  if (result.response.text().trim() === "React") {
    res.status(200).json({
      prompts: [
        BASE_PROPMT,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.\n\n ${reactTemplate} Here is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n  - package-lock.json\n `,
      ],
      uiPrompts: [reactTemplate],
    });
  } else if (result.response.text().trim() === "Node") {
    res.status(200).json({
      prompts: [
        BASE_PROPMT,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.\n\n ${nodeTemplate} Here is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n  - package-lock.json\n `,
      ],
      uiPrompts: [nodeTemplate],
    });
  } else {
    res.status(403).json({ message: "Feature not yet available" });
  }
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  const result = await model.generateContentStream({
    contents: [
      {
        role: "user",
        parts: messages,
      },
    ],
    generationConfig: {
      maxOutputTokens: 8000,
      temperature: 0.1,
      responseMimeType: "text/plain",
    },
  });
  let responseText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    responseText += chunkText;
    process.stdout.write(chunkText);
    // res.send(chunkText);
  }

  res.status(200).json({ response: responseText });
});

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is up and running" });
});
app.listen(8000, () => {
  console.log("Server is running on port 8000");
});

// async function run() {
//   const USER_PROMPT = "Create a simple todo app";
//   const result = await model.generateContentStream({
//     contents: [
//       {
//         role: "user",
//         parts: [

//           {
//             text: `<bolt_running_commands>\n</bolt_running_commands>\n\nCurrent Message:\n\n${USER_PROMPT}\n\nFile Changes:\n\nHere is a list of all files that have been modified since the start of the conversation.\nThis information serves as the true contents of these files!\n\nThe contents include either the full file contents or a diff (when changes are smaller and localized).\n\nUse it to:\n - Understand the latest file modifications\n - Ensure your suggestions build upon the most recent version of the files\n - Make informed decisions about changes\n - Ensure suggestions are compatible with existing code\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - /home/project/.bolt/config.json`,
//           },
//         ],
//       },
//     ],
//     generationConfig: {
//       maxOutputTokens: 8000,
//       temperature: 0.1,
//       responseMimeType: "text/plain",
//     },
//   });

//   for await (const chunk of result.stream) {
//     const chunkText = chunk.text();
//     process.stdout.write(chunkText);
//   }
// }
