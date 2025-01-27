"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
const prompt_1 = require("./prompt");
const react_1 = require("./templates/react");
const prompt_2 = require("./prompt");
const node_1 = require("./templates/node");
const cors_1 = __importDefault(require("cors"));
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("No API key provided.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: (0, prompt_1.getSystemPrompt)(),
});
const templateModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: "Analyze the question and decide whether the app to be built is rect or node app. Decide and respond with only one word, either 'React' or 'Node' and nothing else.",
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.post("/template", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const prompt = req.body.prompt;
    const result = yield templateModel.generateContent({
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
                prompt_2.BASE_PROPMT,
                `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.\n\n ${react_1.reactTemplate} Here is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n  - package-lock.json\n `,
            ],
            uiPrompts: [react_1.reactTemplate],
        });
    }
    else if (result.response.text().trim() === "Node") {
        res.status(200).json({
            prompts: [
                prompt_2.BASE_PROPMT,
                `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.\n\n ${node_1.nodeTemplate} Here is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n  - package-lock.json\n `,
            ],
            uiPrompts: [node_1.nodeTemplate],
        });
    }
    else {
        res.status(403).json({ message: "Feature not yet available" });
    }
}));
app.post("/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    const messages = req.body.messages;
    const result = yield model.generateContentStream({
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
    try {
        for (var _d = true, _e = __asyncValues(result.stream), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const chunk = _c;
            const chunkText = chunk.text();
            responseText += chunkText;
            process.stdout.write(chunkText);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
        }
        finally { if (e_1) throw e_1.error; }
    }
    res.status(200).json({ response: responseText });
}));
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
