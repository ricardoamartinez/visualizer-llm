import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const functions = [
  {
    name: 'generate_visualization',
    description: 'Generate an interactive visualization based on the user\'s request',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'The visualization task to implement',
        },
      },
      required: ['task'],
    },
  },
]

function removeMarkdown(code: string): string {
  return code.replace(/^```[\w]*\n|```$/g, '').trim();
}

function removeDisplayCommands(code: string): string {
  return code.replace(/\b(plt\.show|fig\.show)\s*\([^)]*\)/g, '')
             .replace(/\bfig\.write_html\s*\([^)]*\)/g, '')
             .replace(/\bpio\.show\s*\([^)]*\)/g, '');
}

async function runPythonCode(code: string): Promise<string> {
  const cleanCode = removeMarkdown(code);
  const codeWithoutDisplay = removeDisplayCommands(cleanCode);
  const fullCode = `
import plotly.graph_objects as go
import plotly.express as px
import plotly.io as pio
import json
import numpy as np

${codeWithoutDisplay}

# Ensure the figure is created and named 'fig'
if 'fig' not in locals():
    raise NameError("The variable 'fig' is not defined. Make sure to create a Plotly figure named 'fig'.")

# Disable any interactive mode
import matplotlib
matplotlib.use('Agg')

# Convert the figure to JSON
plot_json = pio.to_json(fig, validate=False)
print(plot_json)
`;
  await fs.writeFile('temp_script.py', fullCode);
  const { stdout, stderr } = await execAsync('python temp_script.py');
  await fs.unlink('temp_script.py');
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout.trim();
}

async function generateAndRunCode(task: string, errorMessage: string | null = null): Promise<{ visualizationData: string | null, error: string | null }> {
  const promptMessage = errorMessage 
    ? `The following code generated an error: ${errorMessage}. Please fix the code and try again. The original task was: ${task}`
    : `Generate Python code for the following visualization task: ${task}. Use Plotly to create an interactive visualization (2D or 3D as appropriate). Create a figure named 'fig'. Do not include any code to display the plot.`;

  const codeResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `You are a code generator. ${promptMessage} Respond only with the code block, no explanations. Use plotly.graph_objects or plotly.express as appropriate for the task.`
      }
    ],
  });

  const codeSnippet = codeResponse.choices[0].message.content || '';

  try {
    const visualizationData = await runPythonCode(codeSnippet);
    return { visualizationData, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { visualizationData: null, error: error.message };
    }
    return { visualizationData: null, error: 'An unknown error occurred' };
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful AI assistant that can generate interactive visualizations and images of all types (2D and 3D). All visuals are automatically shown to the user in the panel on the right. Always use the generate_visualization function when a user asks for a chart or visualization. Do not mention code, programming languages, or technical details in your responses. Focus on describing the visualization and its interactive features."
        },
        ...messages
      ],
      functions: functions,
      function_call: { name: "generate_visualization" },
    })

    const responseMessage = response.choices[0].message

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name
      const functionArgs = JSON.parse(responseMessage.function_call.arguments)

      if (functionName === 'generate_visualization') {
        let result = await generateAndRunCode(functionArgs.task);
        let attempts = 1;

        while (!result.visualizationData && attempts < 3) {
          result = await generateAndRunCode(functionArgs.task, result.error);
          attempts++;
        }

        let finalResponse;
        if (result.visualizationData) {
          finalResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              ...messages,
              responseMessage,
              {
                role: "function",
                name: "generate_visualization",
                content: "Interactive visualization generated successfully.",
              },
            ],
          });
        } else {
          finalResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              ...messages,
              responseMessage,
              {
                role: "function",
                name: "generate_visualization",
                content: `Failed to generate visualization after ${attempts} attempts.`,
              },
            ],
          });
        }

        return NextResponse.json({ 
          response: finalResponse.choices[0].message.content,
          visualizationData: result.visualizationData
        })
      }
    }

    return NextResponse.json({ response: responseMessage.content })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 })
  }
}
