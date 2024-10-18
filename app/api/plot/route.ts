import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('python main.py');
    if (stderr) {
      console.error('Error generating plot:', stderr);
      return new NextResponse('Error generating plot', { status: 500 });
    }
    return new NextResponse(stdout.trim(), { status: 200 });
  } catch (error) {
    console.error('Error generating plot:', error);
    return new NextResponse('Error generating plot', { status: 500 });
  }
}
