# Thunder.bolt

Thunder.bolt is an Ai website that lets you create other websites/projects using React or Node

## Workflow

![](https://github.com/ankushroy25/thunderbolt-ai/blob/main/Architecture.png)

## Installation

Use the package manager [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to run the project locally.

Start the server by the following commands

```bash
#Navigate to server directory
cd server

#Install dependencies
npm install

#Start the server
npm run dev
```

Open a separate terminal window and start the client by the following commands

```bash
#Navigate to client directory
cd client

#Install dependencies
npm install

#Start the server
npm run dev
```

## API Reference

#### Decide the satrter template for the project

```http
  POST /template
```

| Parameter | Type     | Description                                            |
| :-------- | :------- | :----------------------------------------------------- |
| `prompt`  | `string` | **Required**. First prompt of what user wants to build |

#### Get the updated files and codes from LLM

```http
  POST /chat
```

| Parameter | Type     | Description                                             |
| :-------- | :------- | :------------------------------------------------------ |
| `prompt`  | `string` | **Required**. Follow up prompts inside the builder page |

### Author

Ankush Roy  
Email - imankushroy@gmail.com
